import { ChatOpenAI } from '@langchain/openai';
import { Neo4jInterface } from './neo4j';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

export class Chatbot {
    private model: ChatOpenAI;
    private neo4j: Neo4jInterface;

    constructor(neo4jInterface: Neo4jInterface) {
        this.model = new ChatOpenAI({
            modelName: 'gpt-4.1-mini',
            temperature: 0.7,
            maxTokens: 1000,
        });
        this.neo4j = neo4jInterface;
    }

    private async searchRelevantDocuments(query: string, databaseId: string) {
        try {
            const results = await this.neo4j.search_documents(query, databaseId);
            return results.map(doc => ({
                content: doc.content,
                metadata: {
                    filename: doc.filename,
                    fileType: doc.fileType,
                    mediaType: doc.mediaType,
                    extractedText: doc.extractedText || '',
                }
            }));
        } catch (error) {
            console.error('Error searching documents:', error);
            return [];
        }
    }

    private createPromptTemplate() {
        return PromptTemplate.fromTemplate(`
You are a helpful AI assistant that helps users find and understand information from their documents, including videos and audio files.
Your task is to provide a clear, concise, and natural response to the user's question based on the provided context.
Focus on the actual content and meaning of the information.

Context:
{documents}

User Question: {question}

Instructions:
1. For videos, use the transcription and key frame information to describe the content
2. For audio, use the transcription to explain what was said
3. For images, describe the visual content and any text found
4. Provide a natural, conversational response
5. Focus on answering the user's question directly
6. Use the context to support your answer
7. If you're not sure about something, say so
8. Do not mention technical details about text extraction or coordinates

Answer: Let me help you with that.`);
    }

    private cleanExtractedText(text: string): string {
        if (!text) return '';
        // Remove coordinate information and clean up the text
        return text
            .replace(/\[at \([^)]+\)\]/g, '') // Remove coordinate information
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    async chat(query: string, databaseId: string) {
        try {
            // Check if there are any documents in the database
            const hasDocuments = await this.neo4j.has_documents(databaseId);
            if (!hasDocuments) {
                return {
                    response: "I don't have any documents to search through. Please upload some documents first.",
                    documents: []
                };
            }

            // Search for relevant documents
            const relevantDocs = await this.searchRelevantDocuments(query, databaseId);
            
            if (relevantDocs.length === 0) {
                return {
                    response: "I couldn't find any relevant information in the documents. Could you try rephrasing your question or provide more specific details?",
                    documents: []
                };
            }

            // Format documents for the prompt
            const formattedDocs = relevantDocs.map(doc => {
                let content = '';
                if (doc.metadata.mediaType === 'video') {
                    content = `[Video: ${doc.metadata.filename}]\n`;
                    if (doc.metadata.extractedText) {
                        content += `Transcription: ${this.cleanExtractedText(doc.metadata.extractedText)}\n`;
                    }
                    if (doc.content) {
                        const frameTexts = doc.content.split('\n')
                            .filter((line: string) => line.startsWith('[') && line.includes('s]'))
                            .map((line: string) => this.cleanExtractedText(line));
                        if (frameTexts.length > 0) {
                            content += `Key moments:\n${frameTexts.join('\n')}\n`;
                        }
                    }
                } else if (doc.metadata.mediaType === 'audio') {
                    content = `[Audio: ${doc.metadata.filename}]\n`;
                    if (doc.metadata.extractedText) {
                        content += `Transcription: ${this.cleanExtractedText(doc.metadata.extractedText)}\n`;
                    }
                } else if (doc.metadata.mediaType === 'image') {
                    content = `[Image: ${doc.metadata.filename}]\n`;
                    if (doc.metadata.extractedText) {
                        content += `Content: ${this.cleanExtractedText(doc.metadata.extractedText)}\n`;
                    }
                } else {
                    content = doc.content;
                }
                return content;
            }).join('\n\n');

            // Create the chain
            const chain = RunnableSequence.from([
                this.createPromptTemplate(),
                this.model,
                new StringOutputParser(),
            ]);

            // Generate response
            const response = await chain.invoke({
                documents: formattedDocs,
                question: query,
            });

            return {
                response,
                documents: relevantDocs.map(doc => ({
                    filename: doc.metadata.filename,
                    fileType: doc.metadata.fileType,
                    mediaType: doc.metadata.mediaType,
                    content: doc.content,
                })),
            };
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }
} 