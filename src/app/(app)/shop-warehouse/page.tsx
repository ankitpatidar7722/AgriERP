"use client";

import { Store, Warehouse } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { ShopMasterTab } from "./ShopMasterTab";
import { WarehouseMasterTab } from "./WarehouseMasterTab";
import { useT } from "@/features/i18n/provider";

export default function ShopWarehousePage() {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t("shop.pageTitle")}
        description={t("shop.pageDesc")}
      />

      <Tabs defaultValue="shop">
        <TabsList>
          <TabsTrigger value="shop">
            <Store className="mr-1.5 size-4" />
            {t("shop.tabLabel")}
          </TabsTrigger>
          <TabsTrigger value="warehouse">
            <Warehouse className="mr-1.5 size-4" />
            {t("wh.tabLabel")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          <ShopMasterTab />
        </TabsContent>
        <TabsContent value="warehouse" className="space-y-4">
          <WarehouseMasterTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
