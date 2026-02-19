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

## 🚀 Two Ways to Run

### 1. 🖥️ CLI Mode (Local Script)
The original autonomous background monitor.
```bash
node index.js
```

### 2. 🌐 Web Mode (Plug & Play)
A modern, user-friendly interface for connecting any email account.

**Setup Web App:**
1. Navigate to the web directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env.local`:
   Copy `.env.local` and add your `NYLAS_CLIENT_ID` (Application ID) from the Nylas Dashboard.
4. Run locally:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure
- `/web`: Next.js web application for end-users.
- `index.js`: Original Node.js automation script.
- `filter_config.json`: Shared classification logic.

---

## 📁 Configuration

You can customize the classification logic, keywords, and priority levels in `filter_config.json`.

---

## 📄 License

MIT License - feel free to use and modify for your own productivity!
