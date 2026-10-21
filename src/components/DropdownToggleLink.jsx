// ==========================================================
// Dropdown toggle rendered as a button (it opens a menu; it does not navigate), so it
// has no dead `href="#"`. Bootstrap manages aria-expanded.
// ==========================================================
const DropdownToggleLink = (props) => {
  const { title, className, ...others } = props;
  return (
    <button
      type="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      className={className || 'dropdown-item dropdown-toggle'}
      {...others}
    >
      {title}
    </button>
  );
};

export default DropdownToggleLink;
