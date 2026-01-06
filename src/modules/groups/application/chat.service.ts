import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Group } from '../schemas/groups.schemas'
import { Message } from '../schemas/messages.schemas'
import { LeanPopulatedMessage, MessageDto } from '../dtos/get-groups.dtos'

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Message.name)
        private readonly messageModel: Model<Message>,

        @InjectModel(Group.name)
        private readonly groupModel: Model<Group>
    ) {}

    // ===============================
    // 1. Kiểm tra user có thuộc group không
    // ===============================
    async isUserInGroup(groupId: string, userId: string): Promise<boolean> {
        const exists = await this.groupModel.exists({
            _id: groupId,
            participants: new Types.ObjectId(userId)
        })

        return !!exists
    }

    // ===============================
    // 2. Lưu message
    // ===============================
    async saveMessage(params: {
        groupId: string
        senderId: string
        content: string
        type?: 'text' | 'file' | 'image'
        attachments?: string[]
        replyTo?: string
    }) {
        const { groupId, senderId, content, type = 'text', attachments = [], replyTo } = params

        // 1. Check quyền
        const isMember = await this.isUserInGroup(groupId, senderId)
        if (!isMember) {
            throw new ForbiddenException('User is not in this group')
        }

        // 2. Tạo message
        const message = await this.messageModel.create({
            groupId,
            senderId,
            content,
            type,
            attachments,
            replyTo: replyTo ?? null
        })

        // 3. Lấy participants
        const group = await this.groupModel.findById(groupId).select('participants')

        if (!group) throw new NotFoundException('Group not found')

        // 4. Build $inc unreadCounts
        const unreadInc: Record<string, number> = {}

        group.participants.forEach((uid) => {
            const uidStr = uid.toString()
            if (uidStr !== senderId) {
                unreadInc[`unreadCounts.${uidStr}`] = 1
            }
        })

        // 5. Update group (ATOMIC – AN TOÀN)
        await this.groupModel.updateOne(
            { _id: groupId },
            {
                $set: {
                    lastMessage: {
                        content,
                        senderId,
                        createdAt: message.createdAt
                    },
                    updatedAt: new Date()
                },
                $inc: unreadInc
            }
        )

        return message
    }

    // ===============================
    // 3. Lấy message của group (pagination)
    // ===============================
    async getGroupMessages(params: {
        groupId: string
        userId: string
        limit?: number
        before?: Date
    }): Promise<MessageDto[]> {
        const { groupId, userId, limit = 20, before } = params

        // Check quyền
        const isMember = await this.isUserInGroup(groupId, userId)
        if (!isMember) {
            throw new ForbiddenException('User is not in this group')
        }

        const query: any = {
            groupId: groupId
        }

        if (before) {
            query.createdAt = { $lt: before }
        }

        const messages = await this.messageModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: 'senderId',
                select: '_id fullName avatarUrl'
            })
            .lean<LeanPopulatedMessage[]>()

        console.log('fetch group messages ::', messages)
        const res = messages.map(this.toMessageDto)
        console.log('fetch group res ::', res)
        return res
    }

    // ===================== SEARCH MESSAGES =====================
    async searchGroupMessages(params: {
        groupId: string
        userId: string
        keyword: string
        limit?: number
    }): Promise<MessageDto[]> {
        const { groupId, userId, keyword, limit = 20 } = params
        const isMember = await this.isUserInGroup(groupId, userId)
        if (!isMember) throw new ForbiddenException('User is not in this group')

        const regex = new RegExp(keyword, 'i') // case-insensitive

        const messages = await this.messageModel
            .find({ groupId, content: { $regex: regex } })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({ path: 'senderId', select: '_id fullName avatarUrl' })
            .lean<LeanPopulatedMessage[]>()

        console.log('search group messages ::', messages)
        const res = messages.map(this.toMessageDto)
        console.log('search group res ::', res)
        return res
    }

    // ===============================
    // 4. Lấy tất cả group của user
    // ===============================
    async getUserGroups(userId: string): Promise<Group[]> {
        return this.groupModel
            .find({
                participants: new Types.ObjectId(userId)
            })
            .sort({ 'lastMessage.createdAt': -1 })
            .lean<Group[]>()
    }

    async updateGroupLastSeen(groupId: string, userId: string, seenAt: Date) {
        return this.groupModel.findByIdAndUpdate(
            groupId,
            { $set: { [`lastSeenAtByUser.${userId}`]: seenAt } },
            { new: true }
        )
    }

    async resetUnreadCount(groupId: string, userId: string) {
        return this.groupModel.findByIdAndUpdate(groupId, { $set: { [`unreadCounts.${userId}`]: 0 } }, { new: true })
    }

    private toMessageDto(msg: LeanPopulatedMessage): MessageDto {
        return {
            _id: msg._id.toString(),
            groupId: msg.groupId.toString(),
            content: msg.content,
            type: msg.type,
            attachments: msg.attachments,
            replyTo: msg.replyTo ? msg.replyTo.toString() : null,
            createdAt: msg.createdAt.toISOString(),
            senderId: {
                _id: msg.senderId._id.toString(),
                fullName: msg.senderId.fullName,
                avatarUrl: msg.senderId.avatarUrl
            }
        }
    }
}
