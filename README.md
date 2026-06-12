# Manhwa Reader – Setup & GitHub Pages Guide

## מבנה הפרויקט

```
website/
├── chapters/               ← הכנס כאן את תיקיות הצ'אפטרים שלך
│   ├── Chapter 6/
│   │   ├── 001.jpg
│   │   └── ...
│   ├── Chapter 7/
│   └── ...
├── index.html              ← דף הבית
├── reader.html             ← הקורא
├── style.css
├── home.js
├── reader.js
├── generate_index.js       ← סקריפט לייצור האינדקס
└── chapters.json           ← נוצר אוטומטית
```

---

## 🚀 הפעלה ראשונה

### 1. הוסף צ'אפטרים

העתק תיקיות `Chapter X` לתוך `chapters/`:
```
website/chapters/Chapter 6/001.jpg, 002.jpg ...
website/chapters/Chapter 7/001.jpg, 002.jpg ...
```

### 2. צור את האינדקס

```bash
# מתוך תיקיית website/
node generate_index.js
```

### 3. בדוק מקומית (אופציונלי)

```bash
npx serve .
# פתח: http://localhost:3000
```

---

## 📤 פרסום ל-GitHub Pages

### הגדרה ראשונה (פעם אחת)

```bash
# מתוך תיקיית website/
git init
git add .
git commit -m "Initial manhwa reader"
git remote add origin https://github.com/Takanashi-Rikka1/manhwa.git
git branch -M main
git push -u origin main
```

ב-GitHub: `Settings → Pages → Source: main branch, / (root)`

האתר יהיה זמין בכתובת:
```
https://takanashi-rikka1.github.io/manhwa/
```

### עדכון צ'אפטרים

```bash
# לאחר הוספת צ'אפטרים חדשים:
node generate_index.js
git add .
git commit -m "Add Chapter X"
git push
```

---

## 🔄 החלפת מנוואה

```bash
# מחק את כל הצ'אפטרים הישנים
Remove-Item -Recurse -Force chapters\*

# הוסף את המנוואה החדשה
# (העתק תיקיות Chapter X לתוך chapters/)

# עדכן את שם המנוואה בתוך generate_index.js (שורה: const manhwaName = ...)
# אחרי העדכון:
node generate_index.js
git add .
git commit -m "Switch manhwa: New Manhwa Name"
git push
```

---

## ✨ פיצ'רים

| פיצ'ר | תיאור |
|-------|-------|
| 📖 Webtoon scroll | גלילה אנכית רציפה |
| ⬅️➡️ Prev / Next | ניווט בין צ'אפטרים |
| 📋 Chapter select | Dropdown לבחירת צ'אפטר |
| 💾 Continue Reading | שמירת מיקום קריאה |
| 📊 Progress bar | סרגל קריאה עליון |
| 📄 Page counter | X / Y בזמן גלילה |
| ⬆️ Scroll to top | כפתור צף בצד |
| ⌨️ Keyboard | ← / → לניווט |
| 📱 Mobile | תמיכה מלאה בנייד |
| 🌙 Dark mode | תמיד dark |
