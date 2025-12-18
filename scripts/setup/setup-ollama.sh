#!/bin/bash

echo "🤖 Setting up Ollama LLM..."
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Ollama is not running. Please start Docker containers first."
    exit 1
fi

echo "📥 Downloading Mistral 7B model (this may take a while)..."
docker exec varity-ollama ollama pull mistral

echo ""
echo "✅ Testing model..."
docker exec varity-ollama ollama run mistral "What is 2+2?" --verbose

echo ""
echo "✅ Ollama setup complete!"
echo ""
echo "Available models:"
docker exec varity-ollama ollama list
