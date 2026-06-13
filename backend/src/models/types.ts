// User model placeholder
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Document model placeholder
export interface Document {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  uploadedAt: Date;
  updatedAt: Date;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: string;
  mime_type: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  uploaded_at: Date;
  updated_at: Date;
}

// Chat message model placeholder
export interface ChatMessage {
  id: string;
  userId: string;
  documentId?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  createdAt: Date;
}
