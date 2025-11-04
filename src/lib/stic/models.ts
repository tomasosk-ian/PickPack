import { z } from "zod";

export const sticBasicWebhookSchema = z.object({
  topic: z.literal("order"),
  event: z.enum(["shipping_status_changed", "order_confirmed", "payment_status_changed", "order_cancelled"]),
  sent: z.coerce.date(),
  orderId: z.number()
});

export const sticEvtWebhookConfirmedOrderSchema = z.object({
  "MessageId": z.string(), // uuid
  "OrderId": z.number(),
  "CustomerId": z.number(),
  "CustomerEmail": z.string(),
  "CustomerName": z.string(),
  "CartId": z.number().nullish(),
  "RefNumber": z.number().nullish(),
  "ProductsTotalAmount": z.number().nullish(),
  "ProductDiscountsTotalAmount": z.number().nullish(),
  "ProductsSubTotalAmount": z.number().nullish(),
  "DiscountsTotalAmount": z.number().nullish(),
  "DiscountsOnOrderTotalAmount": z.unknown().nullish(),
  "PaymentMethodDiscountTotalAmount": z.unknown().nullish(),
  "PaymentMethodRechargeTotalAmount": z.unknown().nullish(),
  "FidelizationCreditsTotalAmount": z.unknown().nullish(),
  "FinancingTotalAmount": z.unknown().nullish(),
  "FinancingDiscountTotalAmount": z.number().nullish(),
  "TaxesAmount": z.number().nullish(),
  "ShippingAmount": z.number().nullish(),
  "TotalAmount": z.number(),
  "FinancedTotalAmount": z.number().nullish(),
  "ShippingTypeId": z.number().nullish(),
  "ShippingStatusId": z.number().nullish(),
  "ShippingStatusName": z.string().nullish(), // "No preparado"
  "PaymentStatusId": z.unknown().nullish(),
  "PaymentStatusName": z.unknown().nullish(),
  "StockReserved": z.boolean().nullish(),
  "Discount_Coupon_Id": z.number().nullish(),
  "Discount_Coupon_Name": z.string().nullish(),
  "Discount_Cart_Id": z.unknown().nullish(),
  "Discount_Cart_Campaign_Id": z.unknown().nullish(),
  "Discount_Cart_TotalSavings": z.unknown().nullish(),
  "Discount_Products_TotalSavings": z.number().nullish(),
  "OrderCreatedOn": z.string().nullish(),
  "Items": z.array(z.object({
    "Product_Id": z.number(),
    "Product_Name": z.string().nullish(),
    "Variant_Id": z.number().nullish(),
    "Variant_Name": z.unknown().nullish(),
    "Sku": z.string().nullish(),
    "Barcode": z.string().nullish(),
    "Barcodes": z.array(z.string()).nullish(),
    "Quantity": z.number(),
    "EffectiveTotalPrice": z.number().nullish(),
    "Discount_Individual_Id": z.number().nullish(),
    "Discount_Individual_CampaignId": z.number().nullish(),
    "Discount_Individual_TotalSavings": z.number().nullish(),
    "Discount_Individual_CouponCode": z.unknown().nullish(),
    "Discount_Collective_Id": z.unknown().nullish(),
    "Discount_Collective_CampaignId": z.unknown().nullish(),
    "Discount_Collective_TotalSavings": z.number().nullish(),
    "Discount_Collective_CouponCode": z.unknown().nullish(),
    "Price": z.number(),
    "BundleNumber": z.unknown().nullish(),
    "BundleItemType_Id": z.unknown().nullish(),
  }))
});

export const sticEvtWebhookPaymentModifiedOrderSchema = z.object({
  "MessageId": z.string(),
  "OrderId": z.number(),
  "PaymentId": z.unknown().nullish(),
  "PaymentStatus_Id": z.number(),
  "PaymentStatus_Text": z.string(), // "Pagado"
  "Previous_PaymentStatus_Id": z.number(), // 2
  "Previous_PaymentStatus_Text": z.string(), // "Pagado"
  "CustomerId": z.number()
});

export const sticEvtWebhookShippingModifiedOrderSchema = z.object({
  "MessageId": z.string(),
  "OrderId": z.number(),
  "CustomerId": z.number(),
  "ShippingTypeId": z.number(),
  "ShippingStatusId": z.number(),
  "ShippingStatusName": z.string(), // "No preparado"
  "StockReserved": z.boolean(),
  "WasStockReservedBeforeStatusUpdate": z.boolean(),
  "NotifyClient": z.boolean(),
  "Items": z.array(z.object({
    "ProductId": z.number(),
    "VariantId": z.number(),
    "Sku": z.string(),
    "Barcode": z.string(),
    "Quantity": z.number()
  }))
});

export const sticEvtWebhookOrderCanceledOrderSchema = z.object({
  "MessageId": z.string(),
  "OrderId": z.number(),
  "Previous_OrderStatus_Id": z.number(),
  "Previous_OrderStatus_Text": z.string(), // "Abierta"
  "CustomerId": z.number(),
  "FidelizationForeignId": z.unknown().nullish(),
  "FidelizationType": z.unknown().nullish()
});
