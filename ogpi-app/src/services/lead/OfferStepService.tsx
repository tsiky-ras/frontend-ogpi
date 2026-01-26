export interface ValidationStep {
  id: number;
  name: string;
  order: number;
  validators: string[];
  toNotify: string[];
  description: string;
}

export interface StepValidation {
  stepId: number;
  status: 'pending' | 'approved' | 'rejected';
  validatedBy?: string;
  validatedDate?: string;
  comment?: string;
}

export const OFFER_STEPS: ValidationStep[] = [
  {
    id: 1,
    name: 'Validation technique',
    order: 0,
    validators: ['Lead Projet'],
    toNotify: ['Lead Projet', 'Lead Commercial', 'Manager', 'Deputy', 'Business Developer'],
    description: 'Analyse et validation de la faisabilité technique de l\'offre',
  },
  {
    id: 2,
    name: 'Validation financière',
    order: 1,
    validators: ['Lead Commercial', 'Manager'],
    toNotify: ['Lead Commercial', 'Manager', 'Deputy', 'Business Developer'],
    description: 'Vérification et validation du chiffrage de l\'offre',
  },
  {
    id: 3,
    name: 'Revue qualité',
    order: 2,
    validators: ['Business Developer'],
    toNotify: ['Business Developer'],
    description: 'Relecture et assurance qualité de la documentation',
  },
  {
    id: 4,
    name: 'Validation de l\'offre',
    order: 3,
    validators: ['Lead Commercial', 'Manager'],
    toNotify: ['Lead Commercial', 'Manager', 'Deputy'],
    description: 'Validation finale avant soumission au client',
  },
  {
    id: 5,
    name: 'Soumission',
    order: 4,
    validators: ['Business Developer', 'Collaborateur (Pilotage)'],
    toNotify: ['Business Developer', 'Collaborateur (Pilotage)'],
    description: 'Transmission de l\'offre au client',
  },
];

export const getStepNames = (): string[] => {
  return OFFER_STEPS.map(step => step.name);
};

export const getStepByOrder = (order: number): ValidationStep | undefined => {
  return OFFER_STEPS.find(step => step.order === order);
};

export const getStepIndex = (stepId: number): number => {
  const step = OFFER_STEPS.find(s => s.id === stepId);
  return step ? step.order : 0;
};

export const canChangeStep = (fromOrder: number, toOrder: number): boolean => {
  // Processus séquencé: on ne peut aller que vers l'étape suivante ou rester
  return toOrder >= fromOrder && toOrder <= fromOrder + 1;
};

export const getNextStep = (currentOrder: number): ValidationStep | undefined => {
  return OFFER_STEPS.find(step => step.order === currentOrder + 1);
};

export const getPreviousStep = (currentOrder: number): ValidationStep | undefined => {
  return OFFER_STEPS.find(step => step.order === currentOrder - 1);
};
