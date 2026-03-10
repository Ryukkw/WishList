"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Avatar } from "@/components/ui";
import { resolveImageUrl } from "@/lib/imageUrl";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Props = {
  token: string;
  initialName: string;
  initialEmail: string;
  initialAvatarUrl: string;
};

export function SettingsClient({ token, initialName, initialEmail, initialAvatarUrl }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSendingCode, setEmailSendingCode] = useState(false);

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Выберите изображение (JPEG, PNG, WebP или GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Размер файла не более 5 МБ");
      return;
    }
    setProfileError(null);
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/api/auth/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError((data as { detail?: string }).detail || `Ошибка ${res.status}`);
        return;
      }
      setAvatarUrl((data as { avatar_url?: string }).avatar_url ?? "");
      router.refresh();
    } catch {
      setProfileError("Ошибка сети");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setProfileError(null);
    setProfileSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: null }),
      });
      if (res.ok) {
        setAvatarUrl("");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setProfileError((data as { detail?: string }).detail || "Ошибка");
      }
    } catch {
      setProfileError("Ошибка сети");
    } finally {
      setProfileSaving(false);
    }
  }

  async function sendEmailCode() {
    const newEmail = email.trim().toLowerCase();
    if (!newEmail || newEmail === initialEmail.toLowerCase()) {
      setProfileError("Введите новый email, отличный от текущего");
      return;
    }
    setProfileError(null);
    setEmailSendingCode(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/send-verification-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purpose: "change_email", new_email: newEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError((data as { detail?: string }).detail || `Ошибка ${res.status}`);
        return;
      }
      setEmailCodeSent(true);
    } catch {
      setProfileError("Ошибка сети");
    } finally {
      setEmailSendingCode(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    const newEmail = email.trim().toLowerCase();
    const isChangingEmail = newEmail && newEmail !== initialEmail.toLowerCase();
    if (isChangingEmail && !emailCode.trim()) {
      setProfileError("Сначала нажмите «Отправить код» и введите код из письма");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim() || null,
          email: newEmail || undefined,
          avatar_url: avatarUrl.trim() || null,
          verification_code: isChangingEmail ? emailCode.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError((data as { detail?: string }).detail || `Ошибка ${res.status}`);
        return;
      }
      setProfileSuccess(true);
      setEmailCodeSent(false);
      setEmailCode("");
      setTimeout(() => setProfileSuccess(false), 3000);
      router.refresh();
    } catch {
      setProfileError("Ошибка сети");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Новый пароль не менее 6 символов");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError((data as { detail?: string }).detail || `Ошибка ${res.status}`);
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch {
      setPasswordError("Ошибка сети");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="font-display text-lg text-charcoal mb-4">Профиль</h2>
        <form onSubmit={saveProfile} className="space-y-4 max-w-md">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              src={resolveImageUrl(avatarUrl, API_URL)}
              name={name.trim() || email}
              size="lg"
            />
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onAvatarFileChange}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading || profileSaving}
              >
                {avatarUploading ? "Загружаю…" : "Загрузить фото"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={removeAvatar}
                  disabled={profileSaving}
                  className="text-charcoal/60 hover:text-red-600"
                >
                  Удалить фото
                </Button>
              )}
            </div>
          </div>
          <Input
            label="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            disabled={profileSaving}
          />
          <div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailCodeSent(false); }}
              disabled={profileSaving}
              required
            />
            {email.trim().toLowerCase() !== initialEmail.toLowerCase() && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={sendEmailCode}
                  disabled={emailSendingCode || profileSaving}
                >
                  {emailSendingCode ? "Отправляю…" : "Отправить код на текущий email"}
                </Button>
                {emailCodeSent && (
                  <span className="text-sm text-green-600">Код отправлен. Введите его ниже.</span>
                )}
              </div>
            )}
            {emailCodeSent && (
              <Input
                label="Код подтверждения"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="6 цифр из письма"
                disabled={profileSaving}
                className="mt-2"
              />
            )}
          </div>
          {profileError && (
            <p className="text-sm text-red-600" role="alert">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="text-sm text-green-600">Сохранено</p>
          )}
          <Button type="submit" variant="primary" disabled={profileSaving}>
            {profileSaving ? "Сохраняю…" : "Сохранить"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg text-charcoal mb-4">Сменить пароль</h2>
        <form onSubmit={changePassword} className="space-y-4 max-w-md">
          <Input
            label="Текущий пароль"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={passwordSaving}
            required
            autoComplete="current-password"
          />
          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={passwordSaving}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Input
            label="Повторите новый пароль"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={passwordSaving}
            required
            autoComplete="new-password"
          />
          {passwordError && (
            <p className="text-sm text-red-600" role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600">Пароль изменён</p>
          )}
          <Button type="submit" variant="primary" disabled={passwordSaving}>
            {passwordSaving ? "Меняю…" : "Сменить пароль"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
