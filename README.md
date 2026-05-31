<div align="center">
  <img src="https://img.icons8.com/color/96/000000/resume.png" alt="ResumeForge Logo" width="80" />
  
  # ResumeForge
  
  **An Open-Source, AI-Powered, LaTeX Resume Builder.** <br/>
  Featuring a stunning, minimalist "Nothing UI" aesthetic.
  
  [**🚀 View Live Deployment**](https://resume-forage-app.vercel.app)
</div>

<br/>

## 🌟 About The Project

ResumeForge is a next-generation resume builder designed to help students, developers, and professionals create ATS-friendly, industry-standard LaTeX resumes in minutes. 

Instead of struggling with complex LaTeX syntax or fighting with MS Word margins, ResumeForge provides a gorgeous, real-time live preview editor that does the heavy lifting for you. 

### Core Features
- 🤖 **AI-Powered Extraction**: Automatically extracts your skills, experience, and education from raw text, LinkedIn dumps, or old PDFs using Google's Gemini AI.
- 🎨 **Real-Time Live Preview**: Watch your resume compile and format perfectly in real-time as you type.
- 📄 **ATS-Friendly LaTeX Export**: Generate clean, professional PDFs that pass Applicant Tracking Systems (ATS) with flying colors.
- 💾 **Cloud Sync & History**: Securely save multiple resume versions to the cloud and access them from any device.
- 💳 **Annual Subscription**: Just ₹5 for an entire year of unlimited AI edits and PDF downloads.

---

## 🏗️ Architecture

ResumeForge is built using a modern, scalable, and highly secure serverless architecture:

- **Frontend**: Built with **React** and **Vite**, featuring a completely custom vanilla CSS design system inspired by the monochromatic "Nothing OS" aesthetic (dark themes, matrix fonts, stark red accents).
- **Authentication & Database**: **Firebase Auth** and **Firestore** provide secure, real-time data synchronization across all user devices. Strict Security Rules ensure user data is completely private.
- **Backend APIs**: Built on **Vercel Serverless Functions** (`/api`). The backend acts as a secure proxy to communicate with third-party services, ensuring API keys are never exposed to the client.
- **AI Engine**: Integrated with **Google Gemini AI** via the secure Vercel backend to parse complex unstructured resume data into structured JSON.
- **Notification System**: Uses **EmailJS** (securely integrated via the Vercel backend) to dispatch automated payment receipts and support ticket updates.
- **PDF Processing**: Leverages `pdfjs-dist` for client-side PDF parsing.

---

## 👨‍💻 Developed & Maintained By

**Anustup Maity**  
*National Institute of Technology, Durgapur*  
*Indian Institute of Technology, Madras (BS Data Science)*

- **GitHub**: [@AnustupMaity](https://github.com/AnustupMaity)
- **LinkedIn**: [Anustup Maity](https://linkedin.com/in/AnustupMaity)

---

## 📬 Contact

Have a question, found a bug, or want to collaborate? I'd love to hear from you!

**Email**: [anustupmaity2004@gmail.com](mailto:anustupmaity2004@gmail.com)

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

*(Note: For instructions on how to run this project locally, please refer to the `LOCAL.md` file located in the source code.)*
