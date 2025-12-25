export function validateLogin(selectedUser: { name: string }, enteredPassword: string): boolean {
  const lastName = selectedUser.name.split(" ").pop() || ""
  return enteredPassword.toLowerCase() === lastName.toLowerCase()
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}
