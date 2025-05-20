import neo4j, { Driver, Session } from 'neo4j-driver';

export class Neo4jInterface {
    private driver: Driver;

    constructor(uri: string, user: string, password: string) {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }

    async runQuery(query: string, params: Record<string, any> = {}) {
        const session = this.driver.session();
        try {
            const result = await session.run(query, params);
            return result.records.map(record => {
                const obj: Record<string, any> = {};
                (record.keys as string[]).forEach(key => {
                    const value = record.get(key);
                    // Convert Neo4j types to JavaScript types
                    if (neo4j.isInt(value)) {
                        obj[key] = value.toNumber();
                    } else {
                        obj[key] = value;
                    }
                });
                return obj;
            });
        } finally {
            await session.close();
        }
    }

    async close() {
        await this.driver.close();
    }

    async cleanup_database() {
        const session = this.driver.session();
        try {
            // Delete all documents with null databaseId
            await session.run(`
                MATCH (d:Document)
                WHERE d.databaseId IS NULL OR d.databaseId = 'Database null (52 documents)'
                OPTIONAL MATCH (d)-[:CONTAINS]->(c:Content)
                DETACH DELETE d, c
            `);
            
            return { message: 'Database cleaned up successfully' };
        } finally {
            await session.close();
        }
    }

    async get_databases() {
        const session = this.driver.session();
        try {
            const result = await session.run(`
                MATCH (d:Document)
                WITH d.databaseId as databaseId, count(*) as count
                RETURN databaseId, count
            `);
            
            return result.records.map(record => ({
                id: record.get('databaseId'),
                name: `Database ${record.get('databaseId')}`,
                documentCount: record.get('count').toNumber()
            }));
        } finally {
            await session.close();
        }
    }

    async search_documents(query: string, databaseId: string) {
        if (!databaseId) {
            throw new Error('Database ID is required for search');
        }

        const session = this.driver.session();
        try {
            // Split query into words for better matching
            const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
            
            if (queryWords.length === 0) {
                return [];
            }

            const result = await session.run(`
                MATCH (d:Document {databaseId: $databaseId})
                WHERE ANY(word IN $queryWords WHERE 
                    toLower(d.content) CONTAINS word OR 
                    toLower(d.extractedText) CONTAINS word)
                WITH d,
                     [word IN $queryWords | 
                      CASE 
                          WHEN toLower(d.content) CONTAINS word THEN 1 
                          ELSE 0 
                      END] as contentMatches,
                     [word IN $queryWords | 
                      CASE 
                          WHEN toLower(d.extractedText) CONTAINS word THEN 1 
                          ELSE 0 
                      END] as textMatches
                WITH d, 
                     reduce(total = 0, x IN contentMatches | total + x) as contentMatchCount,
                     reduce(total = 0, x IN textMatches | total + x) as textMatchCount
                RETURN d.id as id,
                       d.filename as filename,
                       d.fileType as fileType,
                       d.content as content,
                       d.mediaType as mediaType,
                       d.extractedText as extractedText,
                       d.features as features,
                       contentMatchCount + textMatchCount as score
                ORDER BY score DESC
            `, {
                queryWords,
                databaseId
            });

            return result.records.map(record => ({
                id: record.get('id'),
                filename: record.get('filename'),
                fileType: record.get('fileType'),
                content: record.get('content'),
                mediaType: record.get('mediaType'),
                extractedText: record.get('extractedText'),
                features: record.get('features'),
                score: record.get('score').toNumber()
            }));
        } finally {
            await session.close();
        }
    }

    async store_processed_data(processed_data: any[], databaseId: string) {
        const session = this.driver.session();
        try {
            for (const doc of processed_data) {
                await session.run(`
                    MERGE (d:Document {
                        id: $id,
                        databaseId: $databaseId
                    })
                    SET d.filename = $filename,
                        d.fileType = $fileType,
                        d.content = $content,
                        d.mediaType = $mediaType,
                        d.extractedText = $extractedText,
                        d.features = $features
                `, {
                    id: doc.id,
                    databaseId: databaseId,
                    filename: doc.metadata.filename,
                    fileType: doc.metadata.file_type,
                    content: doc.content,
                    mediaType: doc.metadata.media_type,
                    extractedText: doc.metadata.extracted_text || '',
                    features: doc.metadata.features
                });
            }
        } finally {
            await session.close();
        }
    }

    async check_database_contents() {
        const session = this.driver.session();
        try {
            const result = await session.run(`
                MATCH (d:Document)
                RETURN d.id as id,
                       d.databaseId as databaseId,
                       d.filename as filename,
                       d.fileType as fileType,
                       d.mediaType as mediaType,
                       d.extractedText as extractedText,
                       d.content as content
                ORDER BY databaseId, filename
            `);
            
            return result.records.map(record => ({
                id: record.get('id'),
                databaseId: record.get('databaseId'),
                filename: record.get('filename'),
                fileType: record.get('fileType'),
                mediaType: record.get('mediaType'),
                extractedText: record.get('extractedText'),
                content: record.get('content')
            }));
        } finally {
            await session.close();
        }
    }

    async has_documents(databaseId: string): Promise<boolean> {
        const session = this.driver.session();
        try {
            const result = await session.run(`
                MATCH (d:Document {databaseId: $databaseId})
                RETURN count(d) > 0 as hasDocuments
            `, {
                databaseId
            });
            
            return result.records[0].get('hasDocuments');
        } finally {
            await session.close();
        }
    }
}