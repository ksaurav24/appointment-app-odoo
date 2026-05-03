import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PersonsTable } from "@/components/organization/inventory/persons-table";
import { ResourcesTable } from "@/components/organization/inventory/resources-table";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage staff and resources that customers can book.
        </p>
      </header>
      <Tabs defaultValue="persons">
        <TabsList>
          <TabsTrigger value="persons">Persons</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="persons" className="pt-6">
          <PersonsTable />
        </TabsContent>
        <TabsContent value="resources" className="pt-6">
          <ResourcesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
