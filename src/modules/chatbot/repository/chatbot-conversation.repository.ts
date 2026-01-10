import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ChatbotConversation, ChatbotConversationDocument, TopicSnapshot } from '../schemas/chatbot-conversation.schema'
import mongoose from 'mongoose'

@Injectable()
export class ChatbotConversationRepository {
    constructor(
        @InjectModel(ChatbotConversation.name)
        private readonly conversationModel: Model<ChatbotConversationDocument>
    ) {}

    /**
     * Tạo conversation mới
     */
    async create(userId: mongoose.Types.ObjectId, title: string): Promise<ChatbotConversationDocument> {
        return await this.conversationModel.create({
            userId,
            title,
            messages: [],
            status: 'active',
            lastMessageAt: new Date()
        })
    }

    /**
     * Lấy conversations của user
     */
    async findByUserId(
        userId: mongoose.Types.ObjectId,
        status?: 'active' | 'archived'
    ): Promise<ChatbotConversationDocument[]> {
        const query: any = { userId }
        if (status) {
            query.status = status
        }

        return await this.conversationModel.find(query).sort({ lastMessageAt: -1 }).exec()
    }

    /**
     * Lấy conversation theo ID
     */
    async findById(conversationId: string): Promise<ChatbotConversationDocument | null> {
        return await this.conversationModel.findById(conversationId).exec()
    }

    /**
     * Lấy conversation theo ID và userId (bảo mật)
     */
    async findByIdAndUserId(
        conversationId: mongoose.Types.ObjectId,
        userId: mongoose.Types.ObjectId
    ): Promise<ChatbotConversationDocument | null> {
        return await this.conversationModel.findOne({ _id: conversationId, userId, deleted_at: null }).exec()
    }

    /**
     * Cập nhật conversation (title, status)
     */
    async update(
        conversationId: string,
        updateData: Partial<ChatbotConversation>
    ): Promise<ChatbotConversationDocument | null> {
        return await this.conversationModel.findByIdAndUpdate(conversationId, updateData, { new: true }).exec()
    }

    /**
     * Thêm message vào conversation
     */
    async addMessage(
        conversationId: string,
        message: {
            id: string
            role: 'user' | 'assistant'
            content: string
            topics?: TopicSnapshot[]
            timestamp: Date
        }
    ): Promise<ChatbotConversationDocument | null> {
        return await this.conversationModel
            .findByIdAndUpdate(
                conversationId,
                {
                    $push: { messages: message },
                    $set: { lastMessageAt: new Date() }
                },
                { new: true }
            )
            .exec()
    }

    /**
     * Xóa conversation
     */
    async delete(conversationId: string): Promise<boolean> {
        const result = await this.conversationModel.deleteOne({ _id: conversationId }).exec()
        return result.deletedCount > 0
    }

    /**
     * Xóa conversation (có kiểm tra userId)
     */
    async deleteByIdAndUserId(conversationId: string, userId: mongoose.Types.ObjectId): Promise<boolean> {
        const result = await this.conversationModel.deleteOne({ _id: conversationId, userId }).exec()
        return result.deletedCount > 0
    }

    /**
     * Đếm số conversations của user
     */
    async countByUserId(userId: mongoose.Types.ObjectId, status?: 'active' | 'archived'): Promise<number> {
        const query: any = { userId }
        if (status) {
            query.status = status
        }
        return await this.conversationModel.countDocuments(query).exec()
    }
}
