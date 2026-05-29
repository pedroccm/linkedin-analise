import type { Locale } from "./config";

// Nested dictionary. Both server and client read the same shape.
// Only user-facing surfaces are translated; the admin panel stays in English.

export const dictionaries = {
  pt: {
    nav: {
      profiles: "Perfis",
      feed: "Feed",
      timeline: "Atividade",
      admin: "Admin",
      signIn: "Entrar",
      signOut: "Sair",
    },
    landing: {
      heroLine1: "Acompanhe qualquer perfil do LinkedIn.",
      heroLine2: "Sem ruído.",
      subtitle:
        "Monitore posts, reações e comentários de qualquer pessoa ou empresa. Veja tendências de engajamento, ritmo de publicação e com quem eles realmente interagem.",
      startFree: "Começar grátis",
      seePricing: "Ver planos",
      featuresTitle: "O que você acompanha",
      f1Title: "Posts e métricas",
      f1Body:
        "Até 100 posts por perfil, com curtidas, comentários e republicações. Ordene por data ou engajamento. Busca em todo o conteúdo.",
      f2Title: "Pegada de comportamento",
      f2Body:
        "Veja no que eles reagem e comentam. Descubra os 10 perfis com quem mais interagem.",
      f3Title: "Ritmo e tendências",
      f3Body:
        "Gráfico de posts por semana, engajamento médio, melhor post, conteúdo próprio vs. compartilhado. Tudo atualizado sob demanda.",
      pricingTitle: "Preços simples",
      pricingSub:
        "Pague via PIX. 30 dias de acesso por pagamento. Cancele quando quiser, é só não renovar.",
      popular: "Popular",
      forever: "para sempre",
      per30: "por 30 dias · via PIX",
      ctaSignup: "Cadastrar",
      ctaStartFree: "Começar grátis",
      faqTitle: "Perguntas frequentes",
      faq1Q: "De onde vêm os dados?",
      faq1A:
        "Coletamos apenas dados públicos do perfil, como uma pessoa que visita a página. Não acessamos a conta de ninguém.",
      faq2Q: "Vocês cobram por sincronização?",
      faq2A:
        "Não. As sincronizações do seu plano são ilimitadas. Você só paga a mensalidade fixa.",
      faq3Q: "Posso fazer upgrade do plano grátis?",
      faq3A:
        "Sim, a qualquer momento. Seus dados continuam, só aumenta o limite de perfis.",
      faq4Q: "Isso é permitido pelo LinkedIn?",
      faq4A:
        "Lemos só dados públicos, o mesmo que um visitante humano veria. Não logamos na conta de ninguém.",
      finalCta: "Comece grátis agora",
    },
    auth: {
      signInTitle: "Entrar",
      signUpTitle: "Criar conta",
      forgotTitle: "Recuperar senha",
      signInTab: "Entrar",
      signUpTab: "Cadastrar",
      email: "Email",
      emailPlaceholder: "voce@email.com",
      password: "Senha",
      passwordSignupPlaceholder: "Pelo menos 6 caracteres",
      passwordSigninPlaceholder: "Sua senha",
      signInBtn: "Entrar",
      signUpBtn: "Criar conta",
      sendResetBtn: "Enviar link de recuperação",
      forgotLink: "Esqueci a senha",
      backToSignIn: "← Voltar para entrar",
      signupConfirm: "Conta criada. Confirme pelo email antes de entrar.",
      resetSent: "Confira seu email para o link de redefinição de senha.",
      newPasswordTitle: "Definir nova senha",
      newPassword: "Nova senha",
      confirmPassword: "Confirmar senha",
      repeatPassword: "Repita a senha",
      saveNewPassword: "Salvar nova senha",
      saving: "Salvando…",
      passwordsDontMatch: "As senhas não conferem.",
    },
    home: {
      heading: "Comece agora",
      subtitle:
        "Adicione o primeiro perfil de uma empresa ou pessoa e comece a acompanhar. A gente monitora por você.",
      placeholder: "Cole o link do LinkedIn (perfil ou empresa)",
      add: "Adicionar",
      companyHint:
        "Para empresas, também trazemos quem trabalha lá.",
      empty: "Você ainda não acompanha ninguém. Adicione o primeiro acima.",
      person: "Pessoa",
      company: "Empresa",
      posts: "posts",
      synced: "Atualizado",
      syncAll: "Atualizar todos",
      syncing: "Atualizando…",
    },
  },

  en: {
    nav: {
      profiles: "Profiles",
      feed: "Feed",
      timeline: "Activity",
      admin: "Admin",
      signIn: "Sign in",
      signOut: "Sign out",
    },
    landing: {
      heroLine1: "Track any LinkedIn profile.",
      heroLine2: "Without the noise.",
      subtitle:
        "Monitor posts, reactions, and comments from any person or company. See engagement trends, content cadence, and who they actually engage with.",
      startFree: "Start free",
      seePricing: "See pricing",
      featuresTitle: "What you track",
      f1Title: "Posts + analytics",
      f1Body:
        "Up to 100 posts per profile, with likes, comments, reposts. Sort by date or engagement. Full-text search.",
      f2Title: "Behavioral footprint",
      f2Body:
        "See what they react to and comment on. Discover the top 10 people they engage with most.",
      f3Title: "Cadence & trends",
      f3Body:
        "Posts-per-week chart, average engagement, best post, content vs. reshare ratio. All updated on demand.",
      pricingTitle: "Simple pricing",
      pricingSub:
        "Pay via PIX. 30 days of access per payment. Cancel anytime by not renewing.",
      popular: "Popular",
      forever: "forever",
      per30: "for 30 days · via PIX",
      ctaSignup: "Sign up",
      ctaStartFree: "Start free",
      faqTitle: "FAQ",
      faq1Q: "Where does the data come from?",
      faq1A:
        "We only read public profile data, same as a human visiting the page. We don't log into anyone's account.",
      faq2Q: "Do you charge per sync?",
      faq2A:
        "No. All your plan's syncs are unlimited. You only pay the flat monthly fee.",
      faq3Q: "Can I upgrade from Free?",
      faq3A:
        "Yes, anytime. Your existing data stays, your profile limit just goes up.",
      faq4Q: "Is this allowed by LinkedIn?",
      faq4A:
        "We read only public data, the same a visitor would see. We never log into anyone's account.",
      finalCta: "Start free now",
    },
    auth: {
      signInTitle: "Sign in",
      signUpTitle: "Create account",
      forgotTitle: "Reset password",
      signInTab: "Sign in",
      signUpTab: "Sign up",
      email: "Email",
      emailPlaceholder: "you@email.com",
      password: "Password",
      passwordSignupPlaceholder: "At least 6 characters",
      passwordSigninPlaceholder: "Your password",
      signInBtn: "Sign in",
      signUpBtn: "Create account",
      sendResetBtn: "Send reset link",
      forgotLink: "Forgot password?",
      backToSignIn: "← Back to sign in",
      signupConfirm: "Account created. Check your email to confirm before signing in.",
      resetSent: "Check your email for the password reset link.",
      newPasswordTitle: "Set new password",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      repeatPassword: "Repeat password",
      saveNewPassword: "Save new password",
      saving: "Saving…",
      passwordsDontMatch: "Passwords don't match.",
    },
    home: {
      heading: "Get started",
      subtitle:
        "Add your first company or person profile and start tracking. We keep an eye on them for you.",
      placeholder: "Paste a LinkedIn link (person or company)",
      add: "Add",
      companyHint: "For companies, we also bring in who works there.",
      empty: "You're not tracking anyone yet. Add your first above.",
      person: "Person",
      company: "Company",
      posts: "posts",
      synced: "Synced",
      syncAll: "Sync all",
      syncing: "Syncing…",
    },
  },
} as const;

export type Dict = (typeof dictionaries)[Locale];

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale];
}
