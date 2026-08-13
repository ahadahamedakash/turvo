/**
 * Shared enum type definitions
 */

export type DayType = "Weekday" | "Weekend" | "Holiday";

export type SlotStatus = "Available" | "Held" | "Booked" | "Blocked" | "Expired";

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled" | "NoShow";

export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export type PaymentType = "Advance" | "Due" | "Refund";

export type PaymentMethod = "Cash" | "Card" | "MobileBanking";

export type CourtStatus = "Available" | "Maintenance" | "Inactive";

export type TenantStatus = "Active" | "Inactive" | "Suspended";

export type InvitationStatus = "Pending" | "Accepted" | "Revoked" | "Expired";

export type PermissionModule = "Booking" | "Customer" | "Court" | "Payment" | "Reports" | "Users";
