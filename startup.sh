#!/bin/bash

echo "🏥 MediScribe MVP - Starting Healthcare Revolution"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Node.js version: $(node --version)${NC}"
echo -e "${BLUE}🔍 npm version: $(npm --version)${NC}"
echo ""

# Install root dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install root dependencies${NC}"
    exit 1
fi

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd server
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install server dependencies${NC}"
    exit 1
fi
cd ..

# Install client dependencies
echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
cd client
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install client dependencies${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${GREEN}✅ All dependencies installed successfully!${NC}"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📄 Creating .env file...${NC}"
    cp .env.example .env
fi

echo "🚀 Starting MediScribe MVP Demo..."
echo ""
echo -e "${BLUE}📊 Server will start on: http://localhost:5000${NC}"
echo -e "${BLUE}🏥 Frontend will start on: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}📋 Demo Instructions:${NC}"
echo "1. Wait for both servers to start"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Enter doctor name and patient ID"
echo "4. Click 'Start Recording' to see real-time transcription"
echo "5. Watch AI-generated SOAP notes appear"
echo ""
echo -e "${GREEN}🎯 This MVP demonstrates the core technology for a $100M+ healthcare business opportunity!${NC}"
echo ""

# Start both servers concurrently
npm run dev 