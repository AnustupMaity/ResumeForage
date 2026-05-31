<div align="center">
  <img src="https://img.icons8.com/color/96/000000/resume.png" alt="ResumeForge Logo" width="64" />
  
  # ResumeForge
  
  **An Open-Source, AI-Powered LaTeX Resume Builder.** <br/>
  
  [**View Live Deployment**](https://resume-forage-app.vercel.app)
</div>

<br/>

## Overview

ResumeForge is a next-generation resume builder engineered for students and professionals to generate ATS-optimized, industry-standard LaTeX resumes. By abstracting the complexity of LaTeX syntax, it offers a real-time editing experience coupled with cloud synchronization and AI-driven content generation.

### Key Capabilities
- **AI Integration**: Extracts and structures data from unstructured text, LinkedIn exports, or legacy PDFs using Google's Gemini AI.
- **Real-Time Compilation**: Live preview environment that instantly compiles input data into a structured visual output.
- **ATS Compliance**: Generates strictly formatted, parser-friendly PDFs optimized for modern Applicant Tracking Systems.
- **Cloud Infrastructure**: Secure, multi-device synchronization with version history via Firebase.

---

## Architecture Overview

ResumeForge leverages a modern serverless infrastructure to ensure scalability, security, and high availability.

```mermaid
graph TD
    Client[Client (React/Vite)] -->|HTTP POST| Vercel[Vercel Serverless API]
    Client -->|Auth & Sync| Firebase[(Firebase Auth & Firestore)]
    
    Vercel -->|Prompt/Data| Gemini[Google Gemini AI]
    Vercel -->|Templates| EmailJS[EmailJS Notifications]
    
    subgraph Frontend
        Client
        PDFJS[pdf.js Parser]
        Compiler[html2pdf]
    end
    
    Client --- PDFJS
    Client --- Compiler
```

### Stack Breakdown
- **Frontend Layer**: React.js bundled via Vite. Implements a custom monochromatic design system.
- **Data & Auth Layer**: Firebase Firestore for real-time document synchronization. Firebase Auth for robust session management. Strict Firestore Security Rules govern data access.
- **Compute Layer**: Vercel Serverless Functions (`/api`). Acts as a secure proxy for third-party integrations, ensuring sensitive API keys remain isolated from the client runtime.
- **AI & Integrations**: 
  - Google Gemini AI for advanced NLP parsing and content rewriting.
  - EmailJS for automated transactional system notifications.

---

## Contact & Maintainer

**Anustup Maity**

- **GitHub**: [@AnustupMaity](https://github.com/AnustupMaity)
- **LinkedIn**: [Anustup Maity](https://linkedin.com/in/AnustupMaity)
- **Email**: [anustupmaity2004@gmail.com](mailto:anustupmaity2004@gmail.com)

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
