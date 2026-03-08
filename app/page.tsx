import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { Button } from "@/components/ui";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen bg-cream">
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal leading-tight">
          Вишлисты, которые не портят сюрприз
        </h1>
        <p className="mt-6 text-lg md:text-xl text-charcoal/80 font-sans max-w-2xl mx-auto">
          Создай список желаний — друзья видят, что подарить, но не видят, кто что забрал. Никаких дублей и испорченных сюрпризов.
        </p>
        <div className="mt-10">
          {session ? (
            <Link href="/dashboard">
              <Button variant="primary" className="min-w-[200px]">
                В дашборд
              </Button>
            </Link>
          ) : (
            <Link href="/auth/register">
              <Button variant="primary" className="min-w-[200px]">
                Создать вишлист
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 border-t border-charcoal/8">
        <div className="grid md:grid-cols-3 gap-10 md:gap-12">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-sage/20 flex items-center justify-center text-2xl">
              🎁
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Один список — много поводов</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm">
              День рождения, свадьба, Новый год. Создай вишлист, добавь ссылки на подарки — друзья зарезервируют или скинутся без дублей.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-coral/10 flex items-center justify-center text-2xl">
              🙈
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Кто что взял — только ты не видишь</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm">
              Ты видишь только «3 подарка зарезервировано» и «собрано 80%». Имена гостей скрыты, чтобы сюрприз остался сюрпризом.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-charcoal/5 flex items-center justify-center text-2xl">
              🔗
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Поделись ссылкой</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm">
              Одна ссылка — все друзья заходят без регистрации, вводят имя и забирают подарок или скидываются. Удобно в мессенджерах.
            </p>
          </div>
        </div>
      </section>

      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-charcoal/50 text-sm font-sans">
        <Link href={session ? "/dashboard" : "/auth/signin"} className="hover:text-charcoal/70">
          {session ? "Мои списки" : "Войти"}
        </Link>
      </footer>
    </main>
  );
}
