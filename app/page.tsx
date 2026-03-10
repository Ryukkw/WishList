import Link from "next/link";
import Image from "next/image";
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
        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          <div className="text-center">
            <div className="w-36 h-36 mx-auto rounded-[2rem] overflow-hidden bg-sage/10 flex items-center justify-center shadow-lg">
              <Image src="/present.png" alt="" width={160} height={160} className="object-cover w-full h-full" />
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Один список на все случаи</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm leading-relaxed">
              День рождения, свадьба, Новый год или просто «хочу порадовать себя». Собери все идеи подарков в одном аккуратном списке вместо десятка заметок и чатов.
            </p>
          </div>
          <div className="text-center">
            <div className="w-36 h-36 mx-auto rounded-[2rem] overflow-hidden bg-coral/5 flex items-center justify-center shadow-lg">
              <Image src="/anonymous-icon.png" alt="" width={160} height={160} className="object-cover w-full h-full" />
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Друзья координируются, сюрприз живёт</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm leading-relaxed">
              Гости видят, что уже забрали, а что свободно, и могут скинуться на дорогой подарок. Ты видишь только цифры — без имён, чтобы не угадывать, кто что подарит.
            </p>
          </div>
          <div className="text-center">
            <div className="w-36 h-36 mx-auto rounded-[2rem] overflow-hidden bg-charcoal/5 flex items-center justify-center shadow-lg">
              <Image src="/share.png" alt="" width={160} height={160} className="object-cover w-full h-full" />
            </div>
            <h2 className="font-display text-xl text-charcoal mt-4">Работает по одной ссылке</h2>
            <p className="mt-2 text-charcoal/70 font-sans text-sm leading-relaxed">
              Отправь ссылку в общий чат — друзья заходят без регистрации, вводят своё имя и сразу резервируют подарки. Красиво открывается и в мессенджерах, и в браузере.
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
