/**
 * Traduit une erreur API en message lisible pour l'utilisateur.
 * @param err   L'erreur catchée
 * @param ctx   Message de repli contextuel (ex: "Impossible de sauvegarder le lot")
 */
export const apiError = (err: unknown, ctx: string): string => {
  const status: number | undefined = (err as any)?.response?.status;
  const serverMsg: string | undefined = (err as any)?.response?.data?.message;

  // Message serveur court et lisible → on l'affiche directement
  if (serverMsg && typeof serverMsg === "string" && serverMsg.length < 200) {
    return serverMsg;
  }

  // Pas de réponse réseau → serveur injoignable
  if ((err as any)?.request && !status) {
    return "Le serveur est injoignable. Vérifiez votre connexion et réessayez.";
  }

  switch (status) {
    case 400: return `${ctx}. Les données envoyées sont invalides — vérifiez les champs saisis.`;
    case 401: return "Votre session a expiré. Veuillez vous reconnecter.";
    case 403: return "Vous n'avez pas les droits nécessaires pour effectuer cette action.";
    case 404: return `${ctx}. L'élément demandé est introuvable.`;
    case 409: return `${ctx}. Un élément identique existe déjà.`;
    case 422: return `${ctx}. Les données ne respectent pas les contraintes requises.`;
    case 500:
    case 502:
    case 503: return "Une erreur est survenue côté serveur. Réessayez dans quelques instants.";
    default:  return `${ctx}. Veuillez réessayer.`;
  }
};
