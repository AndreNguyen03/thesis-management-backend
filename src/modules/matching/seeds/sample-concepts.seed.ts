/**
 * Sample Concepts Seeder
 *
 * Use this to populate the concepts collection with sample data for testing
 *
 * Run: npx ts-node src/modules/matching/seeds/sample-concepts.seed.ts
 */

import { NestFactory } from '@nestjs/core'
import { AppModule } from '../../../app.module'
import { Model } from 'mongoose'
import { Concept } from '../schemas/concept.schema'
import { getModelToken } from '@nestjs/mongoose'

const sampleConcepts = [
    // Computer Science - AI
    {
        key: 'cs.ai',
        label: 'Artificial Intelligence',
        aliases: ['AI', 'artificial intelligence', 'trí tuệ nhân tạo'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cs.ai.machine_learning',
        label: 'Machine Learning',
        aliases: ['ML', 'machine learning', 'máy học'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.ai.deep_learning',
        label: 'Deep Learning',
        aliases: ['deep learning', 'DL', 'học sâu', 'neural networks'],
        depth: 4,
        embedding: []
    },
    {
        key: 'cs.ai.nlp',
        label: 'Natural Language Processing',
        aliases: ['NLP', 'natural language processing', 'xử lý ngôn ngữ tự nhiên', 'text processing'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.ai.computer_vision',
        label: 'Computer Vision',
        aliases: ['computer vision', 'CV', 'thị giác máy tính', 'image processing'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.ai.reinforcement_learning',
        label: 'Reinforcement Learning',
        aliases: ['reinforcement learning', 'RL', 'học tăng cường'],
        depth: 4,
        embedding: []
    },

    // Computer Science - Databases
    {
        key: 'cs.databases',
        label: 'Databases',
        aliases: ['databases', 'database', 'cơ sở dữ liệu', 'CSDL'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cs.databases.sql',
        label: 'SQL Databases',
        aliases: ['SQL', 'relational database', 'MySQL', 'PostgreSQL', 'RDBMS'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.databases.nosql',
        label: 'NoSQL Databases',
        aliases: ['NoSQL', 'MongoDB', 'Cassandra', 'non-relational', 'document database'],
        depth: 3,
        embedding: []
    },

    // Computer Science - Web Development
    {
        key: 'cs.web',
        label: 'Web Development',
        aliases: ['web development', 'web dev', 'phát triển web'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cs.web.frontend',
        label: 'Frontend Development',
        aliases: ['frontend', 'front-end', 'React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.web.backend',
        label: 'Backend Development',
        aliases: ['backend', 'back-end', 'Node.js', 'NestJS', 'Express', 'server-side'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.web.fullstack',
        label: 'Full Stack Development',
        aliases: ['fullstack', 'full-stack', 'full stack', 'MERN', 'MEAN'],
        depth: 3,
        embedding: []
    },

    // Computer Science - Mobile
    {
        key: 'cs.mobile',
        label: 'Mobile Development',
        aliases: ['mobile', 'mobile development', 'app development', 'phát triển ứng dụng di động'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cs.mobile.ios',
        label: 'iOS Development',
        aliases: ['iOS', 'Swift', 'iPhone', 'iPad'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.mobile.android',
        label: 'Android Development',
        aliases: ['Android', 'Kotlin', 'Java'],
        depth: 3,
        embedding: []
    },
    {
        key: 'cs.mobile.crossplatform',
        label: 'Cross-Platform Mobile',
        aliases: ['React Native', 'Flutter', 'cross-platform', 'hybrid'],
        depth: 3,
        embedding: []
    },

    // Data Science
    {
        key: 'datascience',
        label: 'Data Science',
        aliases: ['data science', 'khoa học dữ liệu', 'analytics'],
        depth: 1,
        embedding: []
    },
    {
        key: 'datascience.analytics',
        label: 'Data Analytics',
        aliases: ['analytics', 'data analysis', 'phân tích dữ liệu'],
        depth: 2,
        embedding: []
    },
    {
        key: 'datascience.bigdata',
        label: 'Big Data',
        aliases: ['big data', 'Hadoop', 'Spark', 'dữ liệu lớn'],
        depth: 2,
        embedding: []
    },
    {
        key: 'datascience.visualization',
        label: 'Data Visualization',
        aliases: ['visualization', 'data viz', 'trực quan hóa dữ liệu', 'charts', 'graphs'],
        depth: 2,
        embedding: []
    },

    // Cybersecurity
    {
        key: 'security',
        label: 'Cybersecurity',
        aliases: ['security', 'cybersecurity', 'information security', 'an ninh mạng'],
        depth: 1,
        embedding: []
    },
    {
        key: 'security.network',
        label: 'Network Security',
        aliases: ['network security', 'firewall', 'an ninh mạng'],
        depth: 2,
        embedding: []
    },
    {
        key: 'security.cryptography',
        label: 'Cryptography',
        aliases: ['cryptography', 'encryption', 'mã hóa'],
        depth: 2,
        embedding: []
    },

    // Cloud Computing
    {
        key: 'cloud',
        label: 'Cloud Computing',
        aliases: ['cloud', 'cloud computing', 'điện toán đám mây', 'AWS', 'Azure', 'GCP'],
        depth: 1,
        embedding: []
    },
    {
        key: 'cloud.iaas',
        label: 'Infrastructure as a Service',
        aliases: ['IaaS', 'infrastructure', 'EC2'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cloud.paas',
        label: 'Platform as a Service',
        aliases: ['PaaS', 'platform', 'Heroku'],
        depth: 2,
        embedding: []
    },
    {
        key: 'cloud.saas',
        label: 'Software as a Service',
        aliases: ['SaaS', 'cloud software'],
        depth: 2,
        embedding: []
    },

    // DevOps
    {
        key: 'devops',
        label: 'DevOps',
        aliases: ['devops', 'dev ops', 'CI/CD', 'continuous integration'],
        depth: 1,
        embedding: []
    },
    {
        key: 'devops.containers',
        label: 'Containerization',
        aliases: ['containers', 'Docker', 'Kubernetes', 'K8s'],
        depth: 2,
        embedding: []
    },
    {
        key: 'devops.automation',
        label: 'Automation',
        aliases: ['automation', 'Jenkins', 'GitLab CI', 'GitHub Actions'],
        depth: 2,
        embedding: []
    },

    // Programming Languages
    {
        key: 'programming.python',
        label: 'Python Programming',
        aliases: ['Python', 'python programming', 'lập trình python'],
        depth: 2,
        embedding: []
    },
    {
        key: 'programming.javascript',
        label: 'JavaScript Programming',
        aliases: ['JavaScript', 'JS', 'lập trình javascript', 'TypeScript', 'TS'],
        depth: 2,
        embedding: []
    },
    {
        key: 'programming.java',
        label: 'Java Programming',
        aliases: ['Java', 'java programming', 'lập trình java'],
        depth: 2,
        embedding: []
    },
    {
        key: 'programming.csharp',
        label: 'C# Programming',
        aliases: ['C#', 'CSharp', '.NET', 'dotnet'],
        depth: 2,
        embedding: []
    }
]

async function seedConcepts() {
    console.log('🌱 Starting concept seeder...')

    // Create NestJS application context
    const app = await NestFactory.createApplicationContext(AppModule)

    // Get the Concept model
    const conceptModel = app.get<Model<Concept>>(getModelToken(Concept.name))

    try {
        // Clear existing concepts (optional - comment out if you want to keep existing)
        console.log('🗑️  Clearing existing concepts...')
        await conceptModel.deleteMany({})

        // Insert sample concepts
        console.log(`📝 Inserting ${sampleConcepts.length} concepts...`)
        const inserted = await conceptModel.insertMany(sampleConcepts)

        console.log(`✅ Successfully inserted ${inserted.length} concepts!`)
        console.log('\nSample concepts:')
        inserted.slice(0, 5).forEach((c) => {
            console.log(`  - ${c.key}: ${c.label}`)
        })
        console.log(`  ... and ${inserted.length - 5} more`)
    } catch (error) {
        console.error('❌ Error seeding concepts:', error)
        throw error
    } finally {
        await app.close()
        console.log('\n👋 Seeder completed!')
    }
}

// Run the seeder
if (require.main === module) {
    seedConcepts()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}

export { seedConcepts, sampleConcepts }
