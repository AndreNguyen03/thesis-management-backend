/**
 * Migration Script: Convert studentNames/lecturerNames to students/lecturers objects
 *
 * This script migrates existing defense council data from the old format
 * (studentNames: string[], lecturerNames: string[])
 * to the new format
 * (students: StudentInCouncil[], lecturers: LecturerInCouncil[])
 *
 * Usage:
 * cd thesis-management-backend
 * npx ts-node src/modules/milestones/scripts/migrate-students-lecturers.ts
 */

import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../../../.env') })

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/thesis_management'

interface OldTopicFormat {
    topicId: string
    titleVN: string
    titleEng?: string
    studentNames?: string[]
    lecturerNames?: string[]
    students?: any[]
    lecturers?: any[]
    defenseOrder: number
    scores: any[]
    finalScore?: number
    gradeText?: string
    isLocked: boolean
    members: any[]
}

async function migrateDefenseCouncils() {
    console.log('🚀 Starting Defense Council Migration...\n')

    try {
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...')
        console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`)

        await mongoose.connect(MONGODB_URI)
        console.log('✅ Connected to MongoDB successfully\n')

        // Get the collection directly
        const db = mongoose.connection.db
        const collection = db?.collection('defense_councils')

        if (!collection) {
            throw new Error('Could not access defense_councils collection')
        }

        // Find councils with old format
        const councilsWithOldFormat = await collection
            .find({
                $or: [{ 'topics.studentNames': { $exists: true } }, { 'topics.lecturerNames': { $exists: true } }],
                deleted_at: null
            })
            .toArray()

        console.log(`📊 Found ${councilsWithOldFormat.length} councils to migrate\n`)

        if (councilsWithOldFormat.length === 0) {
            console.log('✨ No councils need migration. All data is up to date!')
            return
        }

        let migratedCouncils = 0
        let migratedTopics = 0
        let skippedTopics = 0
        let errors = 0

        for (const council of councilsWithOldFormat) {
            console.log(`\n📋 Processing Council: ${council.name} (ID: ${council._id})`)

            try {
                let councilHasChanges = false
                const updatedTopics: any[] = []

                for (const topic of council.topics as OldTopicFormat[]) {
                    let topicHasChanges = false
                    const updatedTopic = { ...topic }

                    // Migrate studentNames to students
                    if (topic.studentNames && Array.isArray(topic.studentNames) && !topic.students) {
                        console.log(`   📝 Migrating students for topic: ${topic.titleVN}`)
                        updatedTopic.students = topic.studentNames.map((name: string, index: number) => ({
                            _id: `migrated_student_${council._id}_${topic.topicId}_${index}`,
                            fullName: name.trim(),
                            studentCode: undefined,
                            email: undefined
                        }))
                        delete updatedTopic.studentNames
                        topicHasChanges = true
                        console.log(`      ✓ Migrated ${updatedTopic.students.length} students`)
                    } else if (topic.students) {
                        console.log(`   ⏭️  Topic "${topic.titleVN}" already has students array, skipping...`)
                        skippedTopics++
                    }

                    // Migrate lecturerNames to lecturers
                    if (topic.lecturerNames && Array.isArray(topic.lecturerNames) && !topic.lecturers) {
                        console.log(`   👨‍🏫 Migrating lecturers for topic: ${topic.titleVN}`)
                        updatedTopic.lecturers = topic.lecturerNames.map((name: string, index: number) => {
                            // Parse title from name (e.g., "TS. Nguyễn Văn A", "PGS.TS. Trần Thị B")
                            const titleMatch = name.match(
                                /^(TS\.|ThS\.|PGS\.TS\.|GS\.TS\.|PGS\.|GS\.|CN\.|KS\.)?[\s.]*(.*?)$/i
                            )
                            const title = titleMatch?.[1]?.trim() || ''
                            const fullName = titleMatch?.[2]?.trim() || name.trim()

                            return {
                                _id: `migrated_lecturer_${council._id}_${topic.topicId}_${index}`,
                                userId: `migrated_user_${council._id}_${topic.topicId}_${index}`,
                                fullName: fullName,
                                title: title,
                                email: undefined
                            }
                        })
                        delete updatedTopic.lecturerNames
                        topicHasChanges = true
                        console.log(`      ✓ Migrated ${updatedTopic.lecturers.length} lecturers`)
                    } else if (topic.lecturers) {
                        console.log(`   ⏭️  Topic "${topic.titleVN}" already has lecturers array, skipping...`)
                    }

                    if (topicHasChanges) {
                        migratedTopics++
                        councilHasChanges = true
                    }

                    updatedTopics.push(updatedTopic)
                }

                // Update the council if there were changes
                if (councilHasChanges) {
                    await collection.updateOne(
                        { _id: council._id },
                        {
                            $set: {
                                topics: updatedTopics,
                                updatedAt: new Date()
                            }
                        }
                    )
                    migratedCouncils++
                    console.log(`   ✅ Council migrated successfully`)
                } else {
                    console.log(`   ⏭️  No changes needed for this council`)
                }
            } catch (error) {
                errors++
                console.error(`   ❌ Error migrating council ${council._id}:`, error)
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60))
        console.log('📊 MIGRATION SUMMARY')
        console.log('='.repeat(60))
        console.log(`✅ Successfully migrated councils: ${migratedCouncils}`)
        console.log(`📝 Total topics migrated: ${migratedTopics}`)
        console.log(`⏭️  Topics skipped (already migrated): ${skippedTopics}`)
        console.log(`❌ Errors encountered: ${errors}`)
        console.log(`📋 Total councils processed: ${councilsWithOldFormat.length}`)
        console.log('='.repeat(60))

        if (errors === 0) {
            console.log('\n✨ Migration completed successfully!')
        } else {
            console.log('\n⚠️  Migration completed with some errors. Please check the logs above.')
        }
    } catch (error) {
        console.error('\n💥 FATAL ERROR during migration:', error)
        throw error
    } finally {
        // Disconnect from MongoDB
        await mongoose.disconnect()
        console.log('\n🔌 Disconnected from MongoDB')
    }
}

// Run the migration
console.log('='.repeat(60))
console.log('  DEFENSE COUNCIL DATA MIGRATION')
console.log('  studentNames/lecturerNames → students/lecturers')
console.log('='.repeat(60) + '\n')

migrateDefenseCouncils()
    .then(() => {
        console.log('\n🎉 Migration process finished!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💀 Migration failed with error:', error)
        process.exit(1)
    })
