let count: number = 0

export function setupCounter(element: HTMLButtonElement): void {
  element.addEventListener('click', () => {
    count++
    element.textContent = `count is ${count}`
  })
}
