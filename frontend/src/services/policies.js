export const DEFAULT_POLICY_PAGES = [
  {
    id: 'admin-policy-cgu',
    icon: 'ReceiptLong',
    title: "CONDITIONS GÉNÉRALES D'UTILISATION (CGU)",
    summary: 'Cadre d’utilisation de la plateforme ArchiPrice par les comptes user, supplier et admin.',
    content: 'Les utilisateurs accèdent aux services ArchiPrice selon leur rôle. Les actions sensibles sont journalisées et les données métier restent protégées.',
    translations: { en: {
      title: 'TERMS OF USE',
      summary: 'Rules governing use of ArchiPrice by user, supplier and admin accounts.',
      content: 'Users access ArchiPrice services according to their role. Sensitive actions are logged and business data remains protected.',
    } },
  },
  {
    id: 'admin-policy-privacy',
    icon: 'Info',
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    summary: 'Traitement et protection des données des comptes, projets, simulations, fournisseurs et catalogues.',
    content: 'Les données sont exploitées pour fournir les fonctionnalités de simulation, de validation fournisseur, de catalogue et de support.',
    translations: { en: {
      title: 'PRIVACY POLICY',
      summary: 'Processing and protection of account, project, simulation, supplier and catalogue data.',
      content: 'Data is used to provide simulation, supplier approval, catalogue and support features.',
    } },
  },
  {
    id: 'admin-policy-suppliers',
    icon: 'Workspaces',
    title: 'CONDITIONS FOURNISSEURS',
    summary: 'Règles de validation, publication, refus et retrait des articles proposés par les fournisseurs.',
    content: 'Les fournisseurs soumettent leurs articles à validation. L’admin peut approuver, refuser ou masquer les contenus non conformes.',
    translations: { en: {
      title: 'SUPPLIER TERMS',
      summary: 'Rules for approving, publishing, rejecting and removing supplier items.',
      content: 'Suppliers submit items for approval. Administrators may approve, reject or hide non-compliant content.',
    } },
  },
  {
    id: 'admin-policy-legal',
    icon: 'Folder',
    title: 'MENTIONS LÉGALES',
    summary: 'Informations légales et responsabilité opérationnelle de la plateforme ArchiPrice.',
    content: 'ArchiPrice conserve les informations nécessaires à la traçabilité des actions, aux audits et à la continuité des services.',
    translations: { en: {
      title: 'LEGAL NOTICE',
      summary: 'Legal information and operational responsibility for the ArchiPrice platform.',
      content: 'ArchiPrice retains the information required for action traceability, audits and service continuity.',
    } },
  },
];

export function getSyncedPolicies(adminData) {
  const policies = adminData?.adminSettings?.policies;
  return Array.isArray(policies) ? policies : DEFAULT_POLICY_PAGES;
}

export function localizePolicy(policy, language = 'fr') {
  const isEnglish = String(language || '').toLowerCase().startsWith('en')
    || String(language || '').toLowerCase().startsWith('ang');
  if (!isEnglish) return policy;
  const translation = policy?.translations?.en;
  if (!translation) return policy;
  return {
    ...policy,
    title: translation.title || policy.title,
    summary: translation.summary || policy.summary,
    content: translation.content || policy.content,
    sections: Array.isArray(translation.sections) ? translation.sections : policy.sections,
  };
}

export function getPolicySections(policy) {
  if (Array.isArray(policy?.sections) && policy.sections.length) return policy.sections;
  return String(policy?.content || '')
    .split(/\n{2,}/)
    .map((content, index) => ({
      title: index === 0 ? policy.title : `${policy.title} ${index + 1}`,
      content: content.trim(),
    }))
    .filter((section) => section.content);
}
