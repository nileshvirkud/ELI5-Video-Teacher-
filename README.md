# ELI5 Video Teacher 🎓✨

An AI-powered educational video generator that creates simple, engaging explanations for children. Turn any complex topic into a fun, easy-to-understand video that feels like it was made by a friendly teacher!

## 🌟 Features

- **AI-Powered Content Generation**: Uses GPT-4 to create age-appropriate scripts
- **Professional Voice Synthesis**: ElevenLabs generates natural-sounding narration
- **Dynamic Video Creation**: Pika Labs and RunwayML create engaging visuals
- **Multiple Tone Options**: Funny, serious, poetic, or custom explanations
- **Real-time Progress Tracking**: Watch your video come to life with live updates
- **User-Friendly Interface**: Simple, colorful design perfect for kids and parents
- **Video Gallery**: Save and organize all your educational content
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: Redis + Bull for video processing
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 for videos and audio
- **AI Services**: OpenAI, ElevenLabs, Pika Labs, RunwayML
- **Real-time Updates**: Socket.IO for progress tracking

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Context + Custom hooks
- **Build Tool**: Vite for fast development
- **Real-time**: Socket.IO client for live updates

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server
- AWS S3 account
- API keys for AI services (OpenAI, ElevenLabs, Pika Labs, RunwayML)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/eli5-video-teacher.git
cd eli5-video-teacher
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**

Backend (`backend/.env`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/eli5_video_teacher"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
OPENAI_API_KEY="your-openai-api-key"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
PIKA_API_KEY="your-pika-api-key"
RUNWAYML_API_KEY="your-runwayml-api-key"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="eli5-video-storage"
```

Frontend (`frontend/.env`):
```env
VITE_API_URL="http://localhost:3000/api"
VITE_WS_URL="http://localhost:3000"
```

4. **Set up the database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. **Start the development servers**
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3000
- Frontend on http://localhost:3001

## 🎮 Usage

1. **Register/Login**: Create an account or sign in
2. **Choose a Topic**: Enter anything you want to learn about
3. **Select Tone**: Pick funny, serious, poetic, or custom style
4. **Generate Video**: Watch real-time progress as AI creates your video
5. **Watch & Share**: Enjoy your personalized educational content!

## 📊 Subscription Tiers

- **Free**: 3 videos per hour
- **Premium**: 10 videos per hour + priority processing
- **Unlimited**: 100 videos per hour + premium features

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh tokens
- `GET /api/auth/me` - Get current user

### Videos
- `POST /api/videos/generate` - Start video generation
- `GET /api/videos` - List user's videos
- `GET /api/videos/:id` - Get specific video
- `GET /api/videos/status/:id` - Check generation status
- `DELETE /api/videos/:id` - Delete video

### Health
- `GET /api/health` - Service health check

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## 🐳 Docker Deployment

Build and run with Docker:
```bash
docker-compose up -d
```

This sets up:
- PostgreSQL database
- Redis cache
- Backend API server
- Frontend web server
- Nginx reverse proxy

## 🔒 Security Features

- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: Prevents abuse with configurable limits
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configurable cross-origin policies
- **Content Filtering**: AI-powered inappropriate content detection
- **COPPA Compliance**: Child privacy protection measures

## 🎨 Customization

### Adding New Tones
1. Update the `Tone` enum in `backend/prisma/schema.prisma`
2. Add tone handling in `contentGenerator.ts`
3. Update the frontend form options

### Custom AI Providers
Extend the service classes in `backend/src/services/` to support additional AI providers.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 content generation
- ElevenLabs for voice synthesis
- Pika Labs for video generation
- RunwayML for video effects
- The React and Node.js communities

## 📞 Support

For support, email support@eli5videoteacher.com or create an issue in this repository.

---

Made with ❤️ for curious minds everywhere! 🌟