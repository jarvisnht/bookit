import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import ChatWidget from "@/components/chat/ChatWidget";

interface Props {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}

export default async function BusinessLayout({ children, params }: Props) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { name: true, slug: true },
  });

  if (!business) notFound();

  return (
    <>
      {children}
      <ChatWidget businessSlug={business.slug} businessName={business.name} />
    </>
  );
}
