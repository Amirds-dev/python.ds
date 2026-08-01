// Authentication Logic (User: Amir / Pass: 1389)
function checkAuth() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('loginError');

    if (!usernameInput || !passwordInput) return;

    // تبدیل اعداد فارسی به انگلیسی برای جلوگیری از خطای کیبورد
    const fixNumbers = (str) => str.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));

    const u = usernameInput.value.trim().toLowerCase();
    const p = fixNumbers(passwordInput.value.trim());

    if ((u === "amir") && p === "1389") {
        sessionStorage.setItem('authenticated', 'true');
        showDashboard();
    } else {
        if (errorEl) errorEl.textContent = 'نام کاربری یا رمز عبور اشتباه است!';
    }
}

function logout() {
    sessionStorage.removeItem('authenticated');
    location.reload();
}

function showDashboard() {
    const loginModal = document.getElementById('loginModal');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginModal) loginModal.style.display = 'none';
    if (adminDashboard) adminDashboard.style.display = 'block';
    
    AdminManager.init();
}

// Check auth status & Setup Event Listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('authenticated') === 'true') {
        showDashboard();
    }

    // اضافه کردن قابلیت Enter زدن در فرم لاگین
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            checkAuth();
        });
    }

    // جلوگیری از رفرش صفحه موقع ثبت درس
    const lessonForm = document.getElementById('lessonForm');
    if (lessonForm) {
        lessonForm.addEventListener('submit', (e) => {
            e.preventDefault();
            AdminManager.saveLesson();
        });
    }

    // بازخوانی اطلاعات ذخیره‌شده ریپازیتوری و توکن در فرم
    const savedRepo = localStorage.getItem('gh_repo');
    const savedToken = localStorage.getItem('gh_token');
    if (savedRepo && document.getElementById('repoPath')) document.getElementById('repoPath').value = savedRepo;
    if (savedToken && document.getElementById('ghToken')) document.getElementById('ghToken').value = savedToken;
});

// Data Manager Class
const AdminManager = {
    data: [],

    init() {
        // جلوگیری از کش شدن هنگام بارگذاری ابتدایی
        fetch('lessons.json?v=' + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                this.data = data;
                this.render();
            })
            .catch(err => {
                console.warn("فایل JSON خوانده نشد. دیتابیس خالی ایجاد شد.", err);
                this.data = [];
                this.render();
            });
    },

    render() {
        this.renderSelect();
        this.renderTree();
    },

    renderSelect() {
        const select = document.getElementById('chapterSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- انتخاب فصل --</option>';
        this.data.forEach((ch, idx) => {
            select.innerHTML += `<option value="${idx}">${ch.chapterTitle}</option>`;
        });
    },

    renderTree() {
        const container = document.getElementById('chaptersAdminList');
        if (!container) return;
        
        container.innerHTML = '';

        this.data.forEach((ch, chIdx) => {
            const item = document.createElement('div');
            item.className = 'chapter-admin-item';
            item.innerHTML = `
                <div class="chapter-admin-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;">
                    <strong>${ch.chapterTitle}</strong>
                    <button class="sm-btn btn-danger" type="button" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="AdminManager.deleteChapter(${chIdx})">حذف فصل</button>
                </div>
                <div style="padding-right: 15px;">
                    ${ch.lessons.map((les) => `
                        <div class="lesson-admin-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; background:rgba(0,0,0,0.2); padding:6px; border-radius:4px;">
                            <span>🔹 ${les.title}</span>
                            <div class="action-btns" style="display:flex; gap:6px;">
                                <button class="sm-btn" type="button" style="background:#0284c7; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="AdminManager.editLesson('${les.id}')">ویرایش</button>
                                <button class="sm-btn btn-danger" type="button" style="background:#dc2626; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="AdminManager.deleteLesson('${les.id}')">حذف</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(item);
        });
    },

    addChapter() {
        const titleInput = document.getElementById('newChapterTitle');
        if (!titleInput) return;
        
        const title = titleInput.value.trim();
        if (!title) return alert("عنوان فصل را وارد کنید!");

        this.data.push({
            chapterTitle: title,
            lessons: []
        });
        titleInput.value = '';
        this.render();
        this.showStatus("فصل جدید اضافه شد. برای اعمال نهایی روی دکمه «انتشار تغییرات» کلیک کنید.", "success");
    },

    deleteChapter(index) {
        if (confirm("آیا از حذف این فصل و تمامی دروس آن اطمینان دارید؟")) {
            this.data.splice(index, 1);
            this.render();
            this.showStatus("فصل حذف شد.", "success");
        }
    },

    saveLesson() {
        const chIdx = document.getElementById('chapterSelect').value;
        const title = document.getElementById('lessonTitleInput').value.trim();
        const youtubeId = document.getElementById('youtubeIdInput').value.trim();
        const docHtml = document.getElementById('docHtmlInput').value;
        const downloadUrl = document.getElementById('downloadUrlInput').value.trim();
        const editId = document.getElementById('editLessonId').value;

        if (chIdx === "") return alert("لطفاً یک فصل را انتخاب کنید!");
        if (!title) return alert("لطفاً عنوان درس را وارد کنید!");

        if (editId) {
            // ویرایش درس موجود
            for (let ch of this.data) {
                const found = ch.lessons.find(l => l.id === editId);
                if (found) {
                    found.title = title;
                    found.youtubeId = youtubeId;
                    found.docHtml = docHtml;
                    found.downloadUrl = downloadUrl;
                    break;
                }
            }
        } else {
            // ساخت درس جدید
            const newId = `${parseInt(chIdx) + 1}-${Date.now()}`;
            this.data[chIdx].lessons.push({
                id: newId,
                title,
                youtubeId,
                docHtml,
                downloadUrl
            });
        }

        this.resetForm();
        this.render();
        this.showStatus("درس با موفقیت ثبت شد. حتماً دکمه «انتشار تغییرات» را بزنید تا در گیت‌هاب ذخیره شود.", "success");
    },

    editLesson(id) {
        let foundLesson = null;
        let foundChIdx = -1;

        this.data.forEach((ch, cIdx) => {
            const l = ch.lessons.find(item => item.id === id);
            if (l) {
                foundLesson = l;
                foundChIdx = cIdx;
            }
        });

        if (foundLesson) {
            document.getElementById('editLessonId').value = foundLesson.id;
            document.getElementById('chapterSelect').value = foundChIdx;
            document.getElementById('lessonTitleInput').value = foundLesson.title;
            document.getElementById('youtubeIdInput').value = foundLesson.youtubeId;
            document.getElementById('docHtmlInput').value = foundLesson.docHtml;
            document.getElementById('downloadUrlInput').value = foundLesson.downloadUrl || '';
            
            const formTitle = document.getElementById('formTitle');
            const submitBtn = document.getElementById('submitBtn');
            if (formTitle) formTitle.textContent = "✏️ ویرایش درس";
            if (submitBtn) submitBtn.textContent = "بروزرسانی درس";

            window.scrollTo({ top: document.getElementById('lessonForm').offsetTop - 20, behavior: 'smooth' });
        }
    },

    deleteLesson(id) {
        if (confirm("آیا از حذف این درس اطمینان دارید؟")) {
            this.data.forEach(ch => {
                ch.lessons = ch.lessons.filter(l => l.id !== id);
            });
            this.render();
            this.showStatus("درس حذف شد.", "success");
        }
    },

    resetForm() {
        const form = document.getElementById('lessonForm');
        if (form) form.reset();
        
        document.getElementById('editLessonId').value = '';
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        if (formTitle) formTitle.textContent = "➕ افزودن / ویرایش درس";
        if (submitBtn) submitBtn.textContent = "ذخیره درس";
    },

    exportJSON() {
        const jsonStr = JSON.stringify(this.data, null, 4);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "lessons.json";
        a.click();
    },

    async commitToGitHub() {
        const repoInput = document.getElementById('repoPath');
        const tokenInput = document.getElementById('ghToken');

        if (!repoInput || !tokenInput) return;

        const repo = repoInput.value.trim();
        const token = tokenInput.value.trim();

        if (!repo || !token) {
            return this.showStatus("لطفاً نام ریپازیتوری و توکن GitHub را در کادر بالا وارد کنید.", "error");
        }

        this.showStatus("⏳ در حال دریافت اطلاعات و برقراری ارتباط با GitHub...", "success");

        try {
            const filePath = "lessons.json";
            const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

            // ۱. دریافت فایل قبلی از گیت‌هاب جهت اخذ کد SHA
            let sha = "";
            const getRes = await fetch(apiUrl, {
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json"
                }
            });

            if (getRes.ok) {
                const fileData = await getRes.json();
                sha = fileData.sha;
            }

            // ۲. تبدیل دقیق JSON به فرمت Base64 با پشتیبانی کامل از حروف فارسی
            const jsonString = JSON.stringify(this.data, null, 2);
            const utf8Bytes = new TextEncoder().encode(jsonString);
            let binary = "";
            utf8Bytes.forEach(b => binary += String.fromCharCode(b));
            const contentEncoded = btoa(binary);

            // ۳. ارسال Commit جدید به ریپازیتوری GitHub
            const putRes = await fetch(apiUrl, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/vnd.github.v3+json"
                },
                body: JSON.stringify({
                    message: "Update lessons.json via Admin Panel",
                    content: contentEncoded,
                    sha: sha || undefined
                })
            });

            if (putRes.ok) {
                // ذخیره اطلاعات تنظیمات در حافظه مرورگر جهت سهولت استفاده مجدد
                localStorage.setItem('gh_repo', repo);
                localStorage.setItem('gh_token', token);

                this.showStatus("✅ تغییرات با موفقیت روی GitHub منتشر شد! (حدود ۱ دقیقه دیگر در سایت اعمال می‌شود)", "success");
            } else {
                const errData = await putRes.json();
                throw new Error(errData.message || "خطا در ارسال اطلاعات به گیت‌هاب");
            }
        } catch (err) {
            console.error(err);
            this.showStatus("❌ خطا در اتصال به GitHub API: " + err.message, "error");
        }
    },

    showStatus(msg, type) {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        el.textContent = msg;
        el.className = `status-msg status-${type === 'error' ? 'error' : 'success'}`;
        el.style.display = 'block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => { 
            el.style.display = 'none'; 
        }, 6000);
    }
};
