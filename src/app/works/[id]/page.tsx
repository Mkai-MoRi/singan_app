import JudgeWorkClient from "./JudgeWorkClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  return <JudgeWorkClient id={Number(idParam)} />;
}
