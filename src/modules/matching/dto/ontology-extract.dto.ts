export class OntologyExtractDto {
    conceptKey: string
    label: string
    score: number
}

export class SyncConceptResponseDto {
    synced: number
    message: string
}

export class ComputeOntologyResponseDto {
    ontology_extract: OntologyExtractDto[]
    embedding?: number[]
}

export class SyncLecturerResponseDto {
    ontology_extract: OntologyExtractDto[]
    chunkId: string
}
