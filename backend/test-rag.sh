#!/bin/bash

API_URL="http://localhost:5005"
EMAIL="test-rag-$(date +%s)@example.com"
PASSWORD="Test123456!"

echo "🧪 Testing RAG Integration"
echo "=========================="
echo ""

# 1. Register user
echo "1️⃣  Registering user..."
REGISTER_RESPONSE=$(curl -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed"
  echo $REGISTER_RESPONSE
  exit 1
fi

echo "✅ User registered. Token: ${TOKEN:0:20}..."
echo ""

# 2. Check OpenAI connection
echo "2️⃣  Checking OpenAI connection..."
OPENAI_HEALTH=$(curl $API_URL/api/openai/health)
echo $OPENAI_HEALTH | grep -q '"ok":true'

if [ $? -eq 0 ]; then
  echo "✅ OpenAI connected"
else
  echo "❌ OpenAI not connected"
  echo $OPENAI_HEALTH
  exit 1
fi
echo ""

# 3. Upload document
echo "3️⃣  Uploading test document..."
UPLOAD_RESPONSE=$(curl -X POST $API_URL/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@../test-document.txt")

DOC_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DOC_ID" ]; then
  echo "❌ Upload failed"
  echo $UPLOAD_RESPONSE
  exit 1
fi

echo "✅ Document uploaded. ID: $DOC_ID"
echo ""

# 4. Wait for indexing
echo "4️⃣  Waiting for document to be indexed..."
for i in {1..30}; do
  DOCS_RESPONSE=$(curl -X GET $API_URL/api/documents \
    -H "Authorization: Bearer $TOKEN")
  
  echo $DOCS_RESPONSE | grep -q '"status":"indexed"'
  
  if [ $? -eq 0 ]; then
    echo "✅ Document indexed successfully!"
    break
  fi
  
  echo $DOCS_RESPONSE | grep -q '"status":"failed"'
  if [ $? -eq 0 ]; then
    echo "❌ Document indexing failed"
    echo $DOCS_RESPONSE
    exit 1
  fi
  
  echo "   Status check $i/30... (waiting 2s)"
  sleep 2
done
echo ""

# 5. Query documents
echo "5️⃣  Querying documents..."
QUERY_RESPONSE=$(curl -X POST $API_URL/api/rag/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Cuáles son las fases de la mitosis?"
  }')

echo $QUERY_RESPONSE | grep -q '"success":true'

if [ $? -eq 0 ]; then
  echo "✅ Query successful!"
  echo "Answer preview:"
  echo $QUERY_RESPONSE | grep -o '"answer":"[^"]*' | cut -d'"' -f4 | cut -c1-200
  echo "..."
else
  echo "❌ Query failed"
  echo $QUERY_RESPONSE
fi
echo ""

# 6. Generate exam questions
echo "6️⃣  Generating exam questions..."
EXAM_RESPONSE=$(curl -X POST $API_URL/api/exams/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionCount": 3,
    "difficulty": "medium",
    "questionTypes": ["multiple_choice"]
  }')

echo $EXAM_RESPONSE | grep -q '"success":true'

if [ $? -eq 0 ]; then
  QUESTION_COUNT=$(echo $EXAM_RESPONSE | grep -o '"count":[0-9]*' | cut -d':' -f2)
  echo "✅ Generated $QUESTION_COUNT questions!"
  echo "First question preview:"
  echo $EXAM_RESPONSE | grep -o '"questionText":"[^"]*' | head -1 | cut -d'"' -f4
else
  echo "❌ Question generation failed"
  echo $EXAM_RESPONSE
fi
echo ""

echo "=========================="
echo "🎉 All tests completed!"
echo ""
echo "Summary:"
echo "- User: $EMAIL"
echo "- Token: ${TOKEN:0:30}..."
echo "- Document ID: $DOC_ID"
