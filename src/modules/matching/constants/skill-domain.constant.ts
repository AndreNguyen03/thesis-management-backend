import { Domain } from './domains.constant'

export const SKILL_DOMAIN_MAP: Record<string, Domain> = {
    AWS: Domain.CLOUD,
    Git: Domain.CLOUD,
    Docker: Domain.CLOUD,

    'Node.js': Domain.WEB,
    ReactJS: Domain.WEB,

    NestJS: Domain.SE,
    Java: Domain.SE,
    'C#': Domain.SE,

    MongoDB: Domain.DATA,
    PostgreSQL: Domain.DATA,
    SQL: Domain.DATA
}
