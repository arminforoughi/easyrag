import React, { useState } from 'react';
import { FolderIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

interface Database {
    id: string;
    name: string;
    documentCount: number;
}

interface DatabaseManagerProps {
    onDatabaseSelect: (databaseId: string) => void;
    selectedDatabaseId: string | null;
}

export default function DatabaseManager({ onDatabaseSelect, selectedDatabaseId }: DatabaseManagerProps) {
    const [databases, setDatabases] = useState<Database[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newDbName, setNewDbName] = useState('');
    const [isCreatingDb, setIsCreatingDb] = useState(false);

    const handleDirectoryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        if (!selectedDatabaseId) {
            alert('Please select a database first');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('databaseId', selectedDatabaseId);

        try {
            await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(progress);
                },
            });
            fetchDatabases();
        } catch (error) {
            console.error('Error uploading files:', error);
            alert('Error uploading files. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const fetchDatabases = async () => {
        try {
            const response = await axios.get('/api/databases');
            setDatabases(response.data.databases);
        } catch (error) {
            console.error('Error fetching databases:', error);
        }
    };

    const handleCreateDatabase = async () => {
        if (!newDbName.trim()) {
            alert('Please enter a name for the new database.');
            return;
        }
        setIsCreatingDb(true);
        try {
            const response = await axios.post('/api/databases/create', { name: newDbName });
            const { databaseId, name } = response.data;
            // Add to local list for immediate feedback
            setDatabases((prev) => [
                { id: databaseId, name, documentCount: 0 },
                ...prev,
            ]);
            setNewDbName('');
            onDatabaseSelect(databaseId);
        } catch (error) {
            console.error('Error creating database:', error);
            alert('Error creating database. Please try again.');
        } finally {
            setIsCreatingDb(false);
        }
    };

    React.useEffect(() => {
        fetchDatabases();
    }, []);

    return (
        <div className="bg-white rounded-lg shadow p-4 mb-4 text-black">
            <h2 className="text-xl font-semibold mb-4">Database Management</h2>
            {/* Create New Database */}
            <div className="mb-4 flex items-center space-x-2">
                <input
                    type="text"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="New database name"
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isCreatingDb}
                />
                <button
                    onClick={handleCreateDatabase}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    disabled={isCreatingDb}
                >
                    {isCreatingDb ? 'Creating...' : 'Create New Database'}
                </button>
            </div>
            {/* Database Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Database
                </label>
                <select
                    value={selectedDatabaseId || ''}
                    onChange={(e) => onDatabaseSelect(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select a database...</option>
                    {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                            {db.name} ({db.documentCount} documents)
                        </option>
                    ))}
                </select>
            </div>
            {/* Directory Upload */}
            <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Directory
                </label>
                <div className="flex items-center space-x-2">
                    <label className="flex-1">
                        <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <FolderIcon className="h-5 w-5 mr-2 text-gray-500" />
                            <span>Choose Directory</span>
                        </div>
                        <input
                            type="file"
                            multiple
                            onChange={handleDirectoryUpload}
                            className="hidden"
                        />
                    </label>
                </div>
                {/* Upload Progress */}
                {isUploading && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Uploading... {uploadProgress}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
} 