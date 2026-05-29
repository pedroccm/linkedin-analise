# LIA · Como o sistema funciona e quanto custa

> Documento de referência interna. Os preços dos atores Apify são **medidos**
> (consultados na API do Apify). As frequências de uso nas simulações são
> **suposições** e estão marcadas como tal: servem de modelo, não são dados reais
> de uso. Atualizar quando houver uso real medido no `/admin/logs`.

Taxa usada nas conversões: **USD 1,00 = R$ 5,00** (mesma do código, `lib/sync-log.ts`).

---

## 1. Arquitetura em uma olhada

```
Usuário (browser)
   │
   ▼
Next.js no Netlify  ──────────────►  Apify (scraping LinkedIn, sob demanda)
   │                                    └─ grava resultado no Supabase
   ▼
Supabase (Postgres + Auth)
   │   auth.users ............ identidade única (SSO entre produtos)
   │   app_users ............. quem é membro do LIA
   │   linkedin_* ............ perfis, posts, reactions, comments, employees
   │   linkedin_users_meta ... plano de cada usuário
   │   linkedin_payments ..... cobranças PIX (AbacatePay)
   │   linkedin_sync_log ..... 1 linha por chamada Apify, com custo estimado
   ▼
AbacatePay (PIX) ── confirma pagamento ──► ativa plano por 30 dias
```

Nada de scraping roda automático: cada chamada ao Apify é disparada por uma ação
do usuário (adicionar perfil, botão Sync, ou o admin "Sync all").

---

## 2. Atores Apify usados

Todos da família `harvestapi` (no-cookies). Preços por item, medidos na API:

| Ator | Quando é chamado | Unidade | Preço unitário |
| --- | --- | --- | --- |
| `harvestapi/linkedin-profile-scraper` | detalhes de uma **pessoa** | perfil | **US$ 0,004** |
| `harvestapi/linkedin-profile-posts` | posts de uma **pessoa** | post | **US$ 0,002** |
| `harvestapi/linkedin-profile-reactions` | curtidas que a pessoa deu | reação | **US$ 0,002** |
| `harvestapi/linkedin-profile-comments` | comentários que a pessoa fez | comentário | **US$ 0,002** |
| `harvestapi/linkedin-company` | detalhes de uma **empresa** | empresa | **US$ 0,004** |
| `harvestapi/linkedin-company-posts` | posts de uma **empresa** | post | **US$ 0,002** |
| `harvestapi/linkedin-company-employees` | funcionários de uma empresa (modo Short) | funcionário | **US$ 0,004** |

Limites por chamada (config em `.env`, variáveis `APIFY_MAX_*`):

| Variável | Valor | Significa |
| --- | --- | --- |
| `APIFY_MAX_POSTS` | 100 | até 100 posts por sync |
| `APIFY_MAX_REACTIONS` | 50 | até 50 reações |
| `APIFY_MAX_COMMENTS` | 50 | até 50 comentários |
| `APIFY_MAX_EMPLOYEES` | 100 | até 100 funcionários (na prática o LinkedIn devolve ~25 por página; o tier free do ator costuma parar em 25) |

---

## 3. Custo por operação de sync

### Sync de uma PESSOA (completo)

| Etapa | Conta | Custo |
| --- | --- | --- |
| Detalhes | US$ 0,004 | US$ 0,004 |
| Posts (100) | 100 × 0,002 | US$ 0,200 |
| Reações (50) | 50 × 0,002 | US$ 0,100 |
| Comentários (50) | 50 × 0,002 | US$ 0,100 |
| **Total** | | **US$ 0,404 ≈ R$ 2,02** |

> Só "detalhes + posts" (sem reactions/comments): **US$ 0,204 ≈ R$ 1,02**.

### Sync de uma EMPRESA (completo)

| Etapa | Conta | Custo |
| --- | --- | --- |
| Detalhes | US$ 0,004 | US$ 0,004 |
| Posts (100) | 100 × 0,002 | US$ 0,200 |
| Funcionários (25 reais) | 25 × 0,004 | US$ 0,100 |
| **Total (realista, 25 func.)** | | **US$ 0,304 ≈ R$ 1,52** |
| Total se viessem 100 func. | +75 × 0,004 | US$ 0,604 ≈ R$ 3,02 |

---

## 4. Planos atuais

| Plano | Preço | Perfis | Syncs |
| --- | --- | --- | --- |
| Free | R$ 0 | 1 | ilimitados |
| Starter | R$ 29/mês | 5 | ilimitados |
| Pro | R$ 90/mês | 20 | ilimitados |

Cobrança: PIX via AbacatePay, ativa o plano por 30 dias. Renovação manual
(pagar de novo estende +30 dias).

---

## 5. Simulações de custo por usuário

> ⚠️ **Suposição:** a coluna "syncs/mês por perfil" é um chute de comportamento,
> não dado real. O custo de COGS sai das contas da seção 3. Margem = receita − COGS.

### Starter (R$ 29, 5 perfis)

| Comportamento (suposto) | Syncs/mês/perfil | Tipo de sync | COGS/mês | Margem |
| --- | --- | --- | --- | --- |
| Adiciona e quase não volta | 1 | completo pessoa | 5 × 1 × R$ 2,02 = R$ 10,10 | **+R$ 18,90** |
| Refresh quinzenal | 2 | só posts | 5 × 2 × R$ 1,02 = R$ 10,20 | **+R$ 18,80** |
| Refresh semanal | 4 | só posts | 5 × 4 × R$ 1,02 = R$ 20,40 | **+R$ 8,60** |
| Refresh semanal completo | 4 | completo pessoa | 5 × 4 × R$ 2,02 = R$ 40,40 | **−R$ 11,40** ❌ |

### Pro (R$ 90, 20 perfis)

| Comportamento (suposto) | Syncs/mês/perfil | Tipo de sync | COGS/mês | Margem |
| --- | --- | --- | --- | --- |
| Adiciona e quase não volta | 1 | completo pessoa | 20 × 1 × R$ 2,02 = R$ 40,40 | **+R$ 49,60** |
| Refresh quinzenal | 2 | só posts | 20 × 2 × R$ 1,02 = R$ 40,80 | **+R$ 49,20** |
| Refresh semanal | 4 | só posts | 20 × 4 × R$ 1,02 = R$ 81,60 | **+R$ 8,40** |
| Refresh semanal completo | 4 | completo pessoa | 20 × 4 × R$ 2,02 = R$ 161,60 | **−R$ 71,60** ❌ |

### Leitura dos cenários

- Com **uso leve/médio** (1 a 2 syncs por perfil no mês), os dois planos dão
  margem boa (60% a 95%).
- O risco aparece no **uso intenso** (refresh semanal + sync completo): a margem
  vira negativa porque os syncs são ilimitados. Hoje isso é uma **aposta** de que
  o comportamento médio será leve.
- Alavancas pra proteger margem, se o uso real subir (medir no `/admin/logs`):
  1. Reduzir os caps default (posts 100→30, reactions/comments 50→20).
  2. Cota de syncs por mês por plano.
  3. Subir preço do Pro.
  4. BYOK (usuário põe o token Apify dele) para os heavy users.

---

## 6. Limites e riscos operacionais

- **Conta Apify (pool único):** todos os usuários consomem o mesmo saldo Apify.
  Hoje a conta em produção (`fearless_shrine`) tem limite de **US$ 29/mês**.
  Isso cobre, por mês, ~57 syncs completos de pessoa ou ~95 de "só posts".
  Quando passar disso, as chamadas falham até virar o ciclo ou subir o plano Apify.
- **Funcionários travados em ~25:** o ator no tier free do dono limita a primeira
  página (25). Pegar mais exige plano pago do Apify ou outro ator.
- **AbacatePay em modo dev:** os PIX gerados em produção não são pagáveis de
  verdade até trocar para a chave de produção.

---

## 7. Acesso e contas

### Admin
- Admin é definido por email na allowlist `ADMIN_EMAILS` (env). Hoje: `pedroccm@gmail.com`.
- Quem loga com um email da allowlist vê o link **Admin** no header e acessa `/admin/*`.
- Login compartilhado (SSO): a mesma conta serve LIA e os outros produtos no mesmo Supabase.

> 🔒 Senhas não ficam neste repositório (ele é público). As credenciais de
> teste/admin são compartilhadas fora do repo (chat/gerenciador de senhas).

### Contas de teste (ambiente de produção)
Cinco contas Pro criadas para teste, com assinatura válida por ~1 ano:

| Email | Plano | Limite de perfis |
| --- | --- | --- |
| `prouser1@example.com` | Pro | 20 |
| `prouser2@example.com` | Pro | 20 |
| `prouser3@example.com` | Pro | 20 |
| `prouser4@example.com` | Pro | 20 |
| `prouser5@example.com` | Pro | 20 |

Todas usam a mesma senha de teste (compartilhada fora do repo). Para remover
depois, basta deletar os usuários em `/admin/users` ou via Supabase.

## 8. Onde olhar no admin

- `/admin` · KPIs (MRR, receita, custo Apify do mês, margem bruta)
- `/admin/logs` · cada chamada Apify com custo, filtro por tipo/usuário/período
- `/admin/usage` · custo Apify acumulado por usuário
- `/admin/users` · plano e perfis de cada membro do LIA
- `/admin/payments` · cobranças PIX
