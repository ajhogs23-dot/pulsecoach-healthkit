export function isValidAccountForm(email: string, password: string) {
  return email.trim().includes("@") && password.length >= 8;
}

export function identityLinkingCopy(provider: string) {
  return `If this email already exists, link ${provider} to the existing VELTURA account instead of creating a duplicate.`;
}
