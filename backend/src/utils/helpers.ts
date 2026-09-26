export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateInvitationLink(token: string, frontendUrl: string): string {
  return `${frontendUrl}/invitations/accept?token=${token}`;
}
