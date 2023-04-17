interface Props {
  open: boolean;
}
export const ChatPluginSelector = ({ open }: Props) => {
  if (!open) {
    return null;
  }
  return <div>Selector</div>;
};
