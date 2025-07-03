import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";

type Props = {
    title: string;
    description: string;
    icon: React.ReactNode;
}

export default function InfoCard({ title, description, icon }: Props) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-row items-center gap-2">
                    {icon}
                    <p className="font-semibold">{title}</p>
                    </div>
            </CardHeader>
            <CardBody>
                <p className="text-sm text-gray-500">{description}</p>
            </CardBody>
        </Card>
    )
}