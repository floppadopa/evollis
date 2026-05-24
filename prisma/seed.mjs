import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();
const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
const avatar = (seed) => `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
// Thematic "cracked screen" demo attachments, generated and stored in
// public/seed/ (the real app stores base64 data URLs). Served by Next at /seed/.
const shot = (n) => `/seed/ecran-fissure-${n}.png`;

/**
 * Three illustrative conversations per client, one of each kind:
 *   1. a message with attached images (vision)
 *   2. an AI auto-escalation to a human (ESCALATED + handoff + audit note)
 *   3. a conversation the AI fully resolves on its own
 */
function exampleConversationsFor(client, i) {
  return [
    {
      client,
      channel: "WEB",
      status: "OPEN",
      category: "TECHNICAL",
      priority: "MEDIUM",
      unread: true,
      title: "Photos de mon écran fissuré",
      startedAgo: 3 * HOUR + i * 7 * MIN,
      msgs: [
        {
          role: "USER",
          content:
            "Bonjour, voici deux photos de l'écran de mon appareil qui s'est fissuré. Est-ce pris en charge par la garantie ?",
          images: [shot(1), shot(2)],
        },
        {
          role: "ASSISTANT",
          content:
            "Merci pour les photos. La fissure part d'un angle, sans point d'impact visible : ce type de défaut relève généralement de la garantie. J'ouvre une demande de réparation et vous recevrez les instructions de retour par e-mail.",
          gap: 2,
          confidence: 0.9,
        },
        { role: "USER", content: "Super, merci !", gap: 6 },
      ],
    },
    {
      client,
      channel: "WEB",
      status: "ESCALATED",
      category: "BILLING",
      takenOver: true,
      priority: "HIGH",
      title: "Litige sur un montant facturé",
      startedAgo: 6 * HOUR + i * 5 * MIN,
      msgs: [
        {
          role: "USER",
          content:
            "On m'a facturé un montant que je n'ai jamais validé, c'est inadmissible. Je veux parler à un vrai conseiller.",
        },
        {
          role: "ASSISTANT",
          content:
            "Je comprends votre mécontentement et je suis sincèrement désolé pour la situation. Ce litige dépasse ce que je peux traiter seul : je transmets immédiatement votre dossier à un conseiller Evollis, qui reviendra vers vous au plus vite.",
          gap: 1,
        },
        {
          role: "SYSTEM",
          content: "Transféré à un conseiller (escalade automatique de l'IA).",
          gap: 1,
        },
      ],
    },
    {
      client,
      channel: "WEB",
      status: "RESOLVED",
      category: "GENERAL",
      priority: "NONE",
      title: "Délai de livraison de mon appareil",
      startedAgo: 2 * DAY + i * 11 * MIN,
      msgs: [
        {
          role: "USER",
          content:
            "Bonjour, sous combien de temps vais-je recevoir mon appareil après ma souscription ?",
        },
        {
          role: "ASSISTANT",
          content:
            "Bonjour ! Après validation du dossier (sous 24 h), l'expédition part en 2 à 3 jours ouvrés avec un numéro de suivi. Vous recevrez un SMS dès l'envoi : vous devriez donc le recevoir d'ici la fin de semaine.",
          gap: 1,
          confidence: 0.88,
        },
        {
          role: "USER",
          content: "Parfait, c'est très clair. Merci beaucoup !",
          gap: 4,
        },
        {
          role: "ASSISTANT",
          content:
            "Avec plaisir ! Bonne journée et à très bientôt chez Evollis.",
          gap: 1,
        },
      ],
    },
  ];
}

/**
 * Create one conversation and its messages, with timestamps that increase
 * realistically from `startedAgo` (ms before now).
 *
 * Extra inbox fields: assignee (Agent | null), priority, labels (Label[]),
 * participants (Agent[]), and `unread` — when true the agent read marker is
 * left behind any trailing customer messages so the inbox shows an unread badge.
 */
async function seedConversation({
  client,
  channel,
  status,
  category,
  priority = "NONE",
  takenOver = false,
  title,
  startedAgo,
  assignee = null,
  labels = [],
  participants = [],
  unread = false,
  msgs,
}) {
  let t = now - startedAgo;
  const messageData = msgs.map((m) => {
    t += (m.gap ?? 2) * MIN;
    const isUser = m.role === "USER";
    const isAssistant = m.role === "ASSISTANT";
    const isOperator = m.role === "OPERATOR";
    return {
      role: m.role,
      content: m.content,
      channel,
      isPrivate: m.isPrivate ?? false,
      category: isUser ? (m.category ?? category) : null,
      categoryConfidence: isUser ? (m.confidence ?? rand(72, 98) / 100) : null,
      modelName: isAssistant ? "gpt-5.4-mini-2026-03-17" : null,
      tokensIn: isAssistant ? rand(150, 600) : null,
      tokensOut: isAssistant ? rand(80, 400) : null,
      latencyMs: isAssistant ? rand(600, 2200) : null,
      authorAgentId: isOperator ? (m.agent?.id ?? assignee?.id ?? null) : null,
      // Attached images live on metadata.images (data URLs in the app; demo
      // uses hosted placeholders here).
      metadata: m.images?.length ? { images: m.images } : undefined,
      createdAt: new Date(t),
    };
  });
  const lastAt = new Date(t);

  // Read marker: caught up (read) -> just after the last message; unread ->
  // sits behind the last non-customer message so trailing USER msgs are unread.
  let agentLastReadAt = new Date(t + MIN);
  if (unread) {
    const lastNonUser = [...messageData].reverse().find((m) => m.role !== "USER");
    agentLastReadAt = lastNonUser ? lastNonUser.createdAt : null;
  }

  return prisma.conversation.create({
    data: {
      clientId: client.id,
      assigneeId: assignee?.id ?? null,
      channel,
      status,
      priority,
      category,
      takenOver,
      title,
      createdAt: new Date(now - startedAgo),
      lastMessageAt: lastAt,
      agentLastReadAt,
      resolvedAt: status === "RESOLVED" ? lastAt : null,
      messages: { create: messageData },
      labels: labels.length ? { connect: labels.map((l) => ({ id: l.id })) } : undefined,
      participants: participants.length
        ? { create: participants.map((a) => ({ agentId: a.id })) }
        : undefined,
    },
  });
}

async function main() {
  // Idempotent: wipe only the support tables (not the nether-grasp ones).
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.label.deleteMany();
  await prisma.client.deleteMany();
  // Note: agents are upserted (not deleted) so their ids stay stable across
  // re-seeds — a logged-in agent's session cookie keeps working.

  // ---- Agents (also the demo login profiles) ----------------
  const upsertAgent = (data) =>
    prisma.agent.upsert({ where: { email: data.email }, create: data, update: data });

  const marine = await upsertAgent({ email: "marine.dubois@evollis.fr", name: "Marine Dubois", role: "ADMIN", availability: "ONLINE", avatarUrl: avatar("marine.dubois@evollis.fr"), lastSeenAt: new Date(now - 2 * MIN) });
  const karim = await upsertAgent({ email: "karim.elamrani@evollis.fr", name: "Karim El Amrani", role: "AGENT", availability: "ONLINE", avatarUrl: avatar("karim.elamrani@evollis.fr"), lastSeenAt: new Date(now - 9 * MIN) });
  const julie = await upsertAgent({ email: "julie.lefebvre@evollis.fr", name: "Julie Lefebvre", role: "AGENT", availability: "BUSY", avatarUrl: avatar("julie.lefebvre@evollis.fr"), lastSeenAt: new Date(now - 35 * MIN) });
  const hugo = await upsertAgent({ email: "hugo.bernard@evollis.fr", name: "Hugo Bernard", role: "AGENT", availability: "OFFLINE", avatarUrl: avatar("hugo.bernard@evollis.fr"), lastSeenAt: new Date(now - 3 * HOUR) });

  // ---- Labels -----------------------------------------------
  const labelDefs = [
    { name: "Remboursement", color: "#10b981" },
    { name: "Garantie", color: "#3b82f6" },
    { name: "Livraison", color: "#f59e0b" },
    { name: "Réparation", color: "#06b6d4" },
    { name: "Litige", color: "#ef4444" },
    { name: "VIP", color: "#a855f7" },
  ];
  const L = {};
  for (const def of labelDefs) {
    L[def.name] = await prisma.label.create({ data: def });
  }

  // ---- Clients ----------------------------------------------
  const camille = await prisma.client.create({
    data: { channel: "WEB", externalId: "cookie_camille_8f21a", email: "camille.laurent@example.fr", name: "Camille Laurent", phone: "+33 6 12 34 56 78", company: "Indépendante", avatarUrl: avatar("camille.laurent@example.fr") },
  });
  const thomas = await prisma.client.create({
    data: { channel: "WEB", externalId: "cookie_thomas_4b07c", email: "thomas.mercier@example.fr", name: "Thomas Mercier", phone: "+33 6 98 76 54 32", company: "Mercier Conseil", avatarUrl: avatar("thomas.mercier@example.fr") },
  });
  const aicha = await prisma.client.create({
    data: { channel: "EMAIL", externalId: "aicha.benali@example.fr", email: "aicha.benali@example.fr", name: "Aïcha Benali", phone: "+33 7 11 22 33 44", company: "Studio Benali", avatarUrl: avatar("aicha.benali@example.fr") },
  });
  const lucas = await prisma.client.create({
    data: { channel: "WHATSAPP", externalId: "+33612345678", name: "Lucas Petit", phone: "+33 6 12 34 56 78", avatarUrl: avatar("lucas.petit") },
  });
  const sofia = await prisma.client.create({
    data: { channel: "WEB", externalId: "cookie_sofia_d93e2", email: "sofia.moreau@example.fr", name: "Sofia Moreau", phone: "+33 6 55 44 33 22", company: "Moreau & Filles", avatarUrl: avatar("sofia.moreau@example.fr") },
  });

  const conversations = [
    {
      client: camille, channel: "WEB", status: "RESOLVED", category: "BILLING",
      assignee: karim, priority: "NONE", labels: [L["Remboursement"]],
      title: "Double prélèvement sur ma mensualité", startedAgo: 22 * DAY,
      msgs: [
        { role: "USER", content: "Bonjour, j'ai été prélevé deux fois ce mois-ci pour mon abonnement. Pouvez-vous vérifier ?" },
        { role: "ASSISTANT", content: "Bonjour Camille, je suis désolé pour ce désagrément. Je vois en effet deux prélèvements de 29,90 € le 3 mai. Le second est une erreur de notre système de facturation. Un remboursement a été déclenché et sera visible sous 3 à 5 jours ouvrés.", gap: 3 },
        { role: "USER", content: "Parfait, merci beaucoup pour la réactivité !", gap: 4 },
        { role: "OPERATOR", content: "Remboursement de 29,90 € validé côté comptabilité, référence RBT-55012. RAS.", gap: 2, agent: karim, isPrivate: true },
        { role: "ASSISTANT", content: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne journée.", gap: 1 },
      ],
    },
    {
      client: camille, channel: "WEB", status: "OPEN", category: "TECHNICAL",
      assignee: null, priority: "HIGH", labels: [L["Réparation"], L["Garantie"]], unread: true,
      title: "Mon smartphone ne s'allume plus", startedAgo: 3 * HOUR,
      msgs: [
        { role: "USER", content: "Mon téléphone loué chez vous ne s'allume plus depuis ce matin, même branché." },
        { role: "ASSISTANT", content: "Bonjour Camille. Essayons un redémarrage forcé : maintenez le bouton marche/arrêt + volume bas pendant 15 secondes. Le logo apparaît-il ?", gap: 2 },
        { role: "USER", content: "Je viens d'essayer, toujours rien à l'écran.", gap: 8 },
        { role: "ASSISTANT", content: "Merci d'avoir testé. L'appareil est probablement en panne matérielle. Je peux ouvrir une demande de réparation sous garantie — souhaitez-vous que je lance la procédure ?", gap: 1 },
        { role: "USER", content: "Oui, lancez la procédure s'il vous plaît, j'en ai besoin pour travailler.", gap: 12 },
      ],
    },
    {
      client: thomas, channel: "WEB", status: "ESCALATED", category: "TECHNICAL", takenOver: true,
      assignee: marine, priority: "HIGH", labels: [L["Garantie"], L["Litige"]], participants: [karim],
      title: "Écran fissuré, litige sur la franchise", startedAgo: 2 * DAY,
      msgs: [
        { role: "USER", content: "L'écran de mon appareil s'est fissuré tout seul, je n'ai pas envie de payer la franchise de 90 €." },
        { role: "ASSISTANT", content: "Je comprends votre frustration, Thomas. Les fissures spontanées peuvent relever de la garantie constructeur. Ce cas dépasse ce que je peux trancher seul, je transmets votre dossier à un conseiller.", gap: 3 },
        { role: "OPERATOR", content: "Photos analysées : la fissure part d'un angle sans point d'impact → défaut couvert, pas de franchise. Je propose l'échange gratuit.", gap: 20, agent: marine, isPrivate: true },
        { role: "OPERATOR", content: "Bonjour Thomas, ici Marine du service client Evollis. J'ai examiné les photos : la fissure part d'un angle sans impact, c'est un défaut couvert. Aucune franchise ne vous sera facturée, l'échange est gratuit.", gap: 5, agent: marine },
      ],
    },
    {
      client: thomas, channel: "WEB", status: "RESOLVED", category: "GENERAL",
      assignee: julie, priority: "NONE",
      title: "Options de rachat en fin de contrat", startedAgo: 14 * DAY,
      msgs: [
        { role: "USER", content: "Mon contrat de location se termine dans 2 mois. Puis-je racheter l'appareil ?" },
        { role: "ASSISTANT", content: "Oui ! En fin de contrat vous avez trois options : racheter l'appareil à sa valeur résiduelle (environ 15 % du prix neuf), le restituer sans frais, ou renouveler avec un modèle plus récent. Souhaitez-vous une estimation du rachat ?", gap: 2 },
        { role: "USER", content: "Oui, le montant pour rachat m'intéresse.", gap: 5 },
        { role: "ASSISTANT", content: "Pour votre modèle, la valeur de rachat est de 119 €. Vous recevrez une offre formelle par e-mail 30 jours avant l'échéance.", gap: 1 },
      ],
    },
    {
      client: aicha, channel: "EMAIL", status: "PENDING", category: "BILLING",
      assignee: julie, priority: "LOW",
      title: "Changer mon RIB pour le prélèvement", startedAgo: 6 * HOUR,
      msgs: [
        { role: "USER", content: "Bonjour, j'ai changé de banque. Comment mettre à jour mon RIB pour les prélèvements ?" },
        { role: "ASSISTANT", content: "Bonjour Aïcha. Vous pouvez mettre à jour votre RIB depuis votre espace client > Paiements > Moyen de prélèvement. Le nouveau mandat SEPA prend effet au prochain cycle. Voulez-vous que je vous envoie le lien direct ?", gap: 2 },
      ],
    },
    {
      client: aicha, channel: "EMAIL", status: "ARCHIVED", category: "BILLING",
      assignee: karim, priority: "NONE",
      title: "Facture du mois dernier introuvable", startedAgo: 30 * DAY,
      msgs: [
        { role: "USER", content: "Je ne retrouve pas ma facture d'avril dans mon espace." },
        { role: "ASSISTANT", content: "Les factures sont disponibles sous Espace client > Documents. La facture d'avril a été émise le 2/04. Je vous l'ai également renvoyée par e-mail.", gap: 4 },
        { role: "USER", content: "Reçue, merci.", gap: 90 },
      ],
    },
    {
      client: lucas, channel: "WHATSAPP", status: "OPEN", category: "TECHNICAL",
      assignee: null, priority: "MEDIUM", labels: [L["Réparation"]], unread: true,
      title: "Suivi de ma réparation en cours", startedAgo: 1 * DAY,
      msgs: [
        { role: "USER", content: "Bonjour, où en est la réparation de mon téléphone envoyé la semaine dernière ?" },
        { role: "ASSISTANT", content: "Bonjour Lucas. Votre appareil (dossier #REP-20418) est au stade « diagnostic terminé, réparation en cours ». Retour estimé sous 4 jours ouvrés. Vous recevrez un SMS au moment de l'expédition.", gap: 2, confidence: 0.91 },
        { role: "USER", content: "Ok merci, et j'ai un appareil de prêt en attendant ?", gap: 6 },
      ],
    },
    {
      client: sofia, channel: "WEB", status: "OPEN", category: "GENERAL",
      assignee: null, priority: "LOW", labels: [L["Livraison"], L["VIP"]],
      title: "Délai de livraison du nouvel appareil", startedAgo: 40 * MIN,
      msgs: [
        { role: "USER", content: "J'ai souscrit hier soir, sous combien de temps je reçois mon téléphone ?" },
        { role: "ASSISTANT", content: "Bonjour Sofia ! Après validation du dossier (sous 24 h), l'expédition se fait en 2 à 3 jours ouvrés avec suivi. Vous devriez donc le recevoir d'ici la fin de semaine.", gap: 1, confidence: 0.84 },
      ],
    },
    {
      client: sofia, channel: "WEB", status: "ESCALATED", category: "BILLING",
      assignee: marine, priority: "URGENT", labels: [L["Remboursement"], L["Litige"], L["VIP"]],
      participants: [marine], unread: true,
      title: "Remboursement après résiliation anticipée", startedAgo: 5 * DAY,
      msgs: [
        { role: "USER", content: "J'ai résilié il y a 3 semaines et je n'ai toujours pas été remboursée de ma caution de 150 €." },
        { role: "ASSISTANT", content: "Je comprends, Sofia. Le remboursement de caution intervient normalement sous 14 jours après réception de l'appareil restitué. Le délai étant dépassé, je transmets votre dossier au service financier pour vérification.", gap: 3 },
        { role: "OPERATOR", content: "Service financier relancé, dossier RES-7741. SLA dépassé de 7 jours — à traiter en priorité.", gap: 30, agent: marine, isPrivate: true },
        { role: "USER", content: "C'est urgent, j'ai vraiment besoin de cet argent. Vous pouvez accélérer ?", gap: 180 },
      ],
    },
  ];

  for (const c of conversations) {
    await seedConversation(c);
  }

  // Per-client examples: images, auto-escalation, and a fully AI-resolved thread.
  const exampleClients = [camille, thomas, aicha, lucas, sofia];
  for (let i = 0; i < exampleClients.length; i++) {
    for (const c of exampleConversationsFor(exampleClients[i], i)) {
      await seedConversation(c);
    }
  }

  const [agents, labels, clients, convos, msgs] = await Promise.all([
    prisma.agent.count(),
    prisma.label.count(),
    prisma.client.count(),
    prisma.conversation.count(),
    prisma.message.count(),
  ]);
  console.log(
    `Seeded — agents: ${agents}, labels: ${labels}, clients: ${clients}, conversations: ${convos}, messages: ${msgs}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
