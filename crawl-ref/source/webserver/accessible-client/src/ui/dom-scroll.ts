export function scrollChildIntoView(container: HTMLElement, child: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  if (childRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - childRect.top + 2;
  } else if (childRect.bottom > containerRect.bottom) {
    container.scrollTop += childRect.bottom - containerRect.bottom + 2;
  }
}
