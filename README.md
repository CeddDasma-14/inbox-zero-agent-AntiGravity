# 📬 Inbox Zero Agent

**Inbox Zero Agent** is an intelligent, autonomous Executive Assistant powered by **Groq (LLaMA 3.3 70B)** and **Nylas**. It transforms your messy inbox into a streamlined workflow by automatically classifying emails, managing scheduling based on real-time availability, and tracking action items.

---

## ✨ Key Features

- **🤖 Intelligent Classification**: Categorizes emails into `URGENT_P0`, `ACTION_REQUIRED`, `CALENDAR_SYNC`, `LOW_SIGNAL`, and `SECURITY_RISK` using advanced LLMs.
- **🚨 Emergency Override**: A dedicated safety layer that instantly flags "Technical or project-stopping issues" based on specific keywords (e.g., *outage*, *critical path*, *showstopper*).
- **📅 Smart Calendar Sync**: Automatically checks your real-time calendar availability and suggests specific 30-minute meetings for scheduling requests.
- **📝 Dynamic TODO Management**: Generates and maintains a `TODO.md` file that acts as a live dashboard for all pending action items.
- **📦 Automated Organization**: Moves low-priority items like newsletters and digests to a "Review Later" folder to reduce cognitive load.
- **🛡️ Security Awareness**: Identifies phishing and scam attempts, flagging them while ensuring no automated reply is sent.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **AI Engine**: [Groq SDK](https://groq.com/) (llama-3.3-70b-versatile)
- **Communication Architecture**: [Nylas SDK v3](https://www.nylas.com/)
- **UI/Feedback**: [Chalk](https://www.npmjs.com/package/chalk) for professional CLI output

---

## 🚀 Getting Started

### Prerequisites

- Node.js installed
- A [Nylas](https://dashboard.nylas.com/) account and Grant ID
- A [Groq](https://console.groq.com/) API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/CeddDasma-14/inbox-zero-agent.git
   cd inbox-zero-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment:
   Create a `.env` file in the root directory and add:
   ```env
   NYLAS_API_KEY=your_nylas_key
   NYLAS_API_URI=https://api.us.nylas.com
   NYLAS_GRANT_ID=your_grant_id
   GROQ_API_KEY=your_groq_key
   USER_EMAIL=your_email@example.com
   ```

### Running the Agent

```bash
node index.js
```

The agent will run an initial scan and then continue monitoring your inbox every 5 minutes.

---

## 📁 Configuration

You can customize the classification logic, keywords, and priority levels in `filter_config.json`.

---

## 📄 License

MIT License - feel free to use and modify for your own productivity!
