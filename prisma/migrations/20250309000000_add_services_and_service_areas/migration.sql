-- CreateTable: Service (master list for filter-by-service like other directories)
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateTable: BusinessService (which services this business offers)
CREATE TABLE "BusinessService" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "BusinessService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessService_businessId_serviceId_key" ON "BusinessService"("businessId", "serviceId");

-- CreateTable: BusinessServiceArea (which cities/areas this business serves)
CREATE TABLE "BusinessServiceArea" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,

    CONSTRAINT "BusinessServiceArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessServiceArea_businessId_cityId_key" ON "BusinessServiceArea"("businessId", "cityId");

-- AddForeignKey Service -> Category
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey BusinessService -> Business, Service
ALTER TABLE "BusinessService" ADD CONSTRAINT "BusinessService_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessService" ADD CONSTRAINT "BusinessService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey BusinessServiceArea -> Business, City
ALTER TABLE "BusinessServiceArea" ADD CONSTRAINT "BusinessServiceArea_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessServiceArea" ADD CONSTRAINT "BusinessServiceArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
