// netlify/functions/chat.js
// Secure API proxy for Firebase operations

const admin = require('firebase-admin');

// Initialize Firebase Admin (server-side only)
if (!admin.apps.length) {
    // For production: Use service account from environment variables
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID
        });
    } else {
        // For development: Use a service account key file (not committed to git)
        try {
            const serviceAccount = require('../../service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        } catch (e) {
            console.warn('No service account found. Using default credentials.');
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID
            });
        }
    }
}

const db = admin.firestore();

exports.handler = async function(event, context) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    // Verify authentication from token
    const token = event.headers.authorization?.split(' ')[1];
    if (!token) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized - No token provided' })
        };
    }

    try {
        // Verify the Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const userId = decodedToken.uid;

        // Handle different methods
        switch (event.httpMethod) {
            case 'GET':
                // Get messages
                const snapshot = await db.collection('chatMessages')
                    .orderBy('timestamp', 'asc')
                    .get();

                const messages = [];
                snapshot.forEach(doc => {
                    messages.push({ id: doc.id, ...doc.data() });
                });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ messages })
                };

            case 'POST':
                // Send message
                const body = JSON.parse(event.body);
                if (!body.text || !body.text.trim()) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Message text is required' })
                    };
                }

                const newMessage = {
                    text: body.text.trim(),
                    userId: userId,
                    senderName: body.senderName || 'User',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                };

                const docRef = await db.collection('chatMessages').add(newMessage);
                
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({ 
                        id: docRef.id, 
                        ...newMessage 
                    })
                };

            case 'DELETE':
                // Delete message
                const deleteId = event.queryStringParameters?.id;
                if (!deleteId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Message ID is required' })
                    };
                }

                // Check if user owns the message
                const msgDoc = await db.collection('chatMessages').doc(deleteId).get();
                if (!msgDoc.exists) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Message not found' })
                    };
                }

                const msgData = msgDoc.data();
                if (msgData.userId !== userId) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'You can only delete your own messages' })
                    };
                }

                await db.collection('chatMessages').doc(deleteId).delete();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Deleted successfully' })
                };

            case 'PUT':
                // Update message
                const updateData = JSON.parse(event.body);
                const updateId = event.queryStringParameters?.id;
                
                if (!updateId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Message ID is required' })
                    };
                }

                if (!updateData.text || !updateData.text.trim()) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Message text is required' })
                    };
                }

                // Check if user owns the message
                const updateDoc = await db.collection('chatMessages').doc(updateId).get();
                if (!updateDoc.exists) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ error: 'Message not found' })
                    };
                }

                const updateMsgData = updateDoc.data();
                if (updateMsgData.userId !== userId) {
                    return {
                        statusCode: 403,
                        headers,
                        body: JSON.stringify({ error: 'You can only edit your own messages' })
                    };
                }

                await db.collection('chatMessages').doc(updateId).update({
                    text: updateData.text.trim()
                });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ success: true, message: 'Updated successfully' })
                };

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};
