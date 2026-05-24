"""
Illustrative training corpus for the BERTopic classifier.

⚠️  This is a *placeholder* for proprietary data. The cluster boundaries that
BERTopic learns are only as good as the corpus it is fit on. In production this
list would be replaced by a large set of real (ideally labelled) customer
questions — the "données propriétaires" — which is what makes the inter-cluster
vector distances meaningful. With this handful of examples the model is purely
demonstrative.

Categories mirror the Prisma `IntentCategory` enum: BILLING / TECHNICAL /
GENERAL (UNKNOWN is only produced at inference, when confidence is too low).
"""

# Labelled examples used to fit the topic model and to compute the per-category
# centroids. French, matching the customer base.
LABELLED_EXAMPLES = [
    # ── BILLING ───────────────────────────────────────────────────────────────
    {"category": "BILLING", "text": "J'ai été prélevé deux fois ce mois-ci pour mon abonnement."},
    {"category": "BILLING", "text": "Comment mettre à jour mon RIB pour les prélèvements ?"},
    {"category": "BILLING", "text": "Je ne retrouve pas ma facture du mois dernier dans mon espace."},
    {"category": "BILLING", "text": "Je n'ai toujours pas été remboursée de ma caution de 150 €."},
    {"category": "BILLING", "text": "Le montant prélevé ne correspond pas à mon contrat."},
    {"category": "BILLING", "text": "Pouvez-vous m'envoyer un justificatif de paiement ?"},
    {"category": "BILLING", "text": "Mon prélèvement SEPA a été rejeté, que dois-je faire ?"},
    {"category": "BILLING", "text": "Je souhaite changer la date de prélèvement mensuel."},
    {"category": "BILLING", "text": "On m'a facturé des frais que je ne comprends pas."},
    {"category": "BILLING", "text": "Quand vais-je recevoir le remboursement de mon trop-perçu ?"},

    # ── TECHNICAL ─────────────────────────────────────────────────────────────
    {"category": "TECHNICAL", "text": "Mon téléphone loué ne s'allume plus, même branché."},
    {"category": "TECHNICAL", "text": "L'écran de mon appareil s'est fissuré tout seul."},
    {"category": "TECHNICAL", "text": "La batterie se décharge en quelques heures."},
    {"category": "TECHNICAL", "text": "Où en est la réparation de mon téléphone envoyé la semaine dernière ?"},
    {"category": "TECHNICAL", "text": "L'appareil redémarre tout seul sans arrêt."},
    {"category": "TECHNICAL", "text": "Le tactile ne répond plus sur la moitié de l'écran."},
    {"category": "TECHNICAL", "text": "Mon ordinateur loué ne se connecte plus au wifi."},
    {"category": "TECHNICAL", "text": "La caméra est devenue floue après une mise à jour."},
    {"category": "TECHNICAL", "text": "L'appareil chauffe énormément pendant la charge."},
    {"category": "TECHNICAL", "text": "Comment lancer une demande de réparation sous garantie ?"},

    # ── GENERAL ───────────────────────────────────────────────────────────────
    {"category": "GENERAL", "text": "Sous combien de temps je reçois mon téléphone après souscription ?"},
    {"category": "GENERAL", "text": "Mon contrat se termine bientôt, puis-je racheter l'appareil ?"},
    {"category": "GENERAL", "text": "Quelles sont les options en fin de contrat de location ?"},
    {"category": "GENERAL", "text": "Quel est le délai de livraison du nouvel appareil ?"},
    {"category": "GENERAL", "text": "Comment fonctionne l'abonnement de location longue durée ?"},
    {"category": "GENERAL", "text": "Puis-je changer de modèle en cours de contrat ?"},
    {"category": "GENERAL", "text": "Quels documents faut-il pour souscrire une offre ?"},
    {"category": "GENERAL", "text": "Proposez-vous un appareil de prêt pendant une réparation ?"},
    {"category": "GENERAL", "text": "Comment suivre l'état de ma commande ?"},
    {"category": "GENERAL", "text": "Est-il possible de mettre mon abonnement en pause ?"},
]

# Guided-BERTopic seed keywords, one list per category (order matters: it must
# match CATEGORIES in classifier.py). These steer the topic representation
# toward each category's vocabulary.
CATEGORY_SEED_KEYWORDS = {
    "BILLING": [
        "facture", "paiement", "prélèvement", "remboursement",
        "rib", "caution", "montant", "sepa", "frais",
    ],
    "TECHNICAL": [
        "panne", "écran", "batterie", "réparation", "redémarrage",
        "appareil", "garantie", "cassé", "wifi", "tactile",
    ],
    "GENERAL": [
        "livraison", "délai", "contrat", "rachat", "souscription",
        "information", "abonnement", "option", "commande",
    ],
}
