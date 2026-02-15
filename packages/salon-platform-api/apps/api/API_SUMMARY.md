'''
# API Summary

This document provides a summary of the Salon Platform API endpoints.

## Authentication

*   `POST /api/v1/auth/login`: Authenticate a user and receive JWT tokens.
*   `POST /api/v1/auth/register`: Register a new user.
*   `POST /api/v1/auth/refresh`: Refresh an expired access token.

## Tenants

*   `GET /api/v1/tenants`: Get a list of tenants.
*   `GET /api/v1/tenants/{id}`: Get a tenant by ID.
*   `GET /api/v1/tenants/slug/{slug}`: Get a tenant by slug.

## Branches

*   `GET /api/v1/branches`: Get a list of branches for the current tenant.
*   `GET /api/v1/branches/{id}`: Get a branch by ID.

## Employees

*   `GET /api/v1/employees`: Get a list of employees for the current tenant.
*   `GET /api/v1/employees/{id}`: Get an employee by ID.
*   `GET /api/v1/employees/by-service/{serviceId}`: Get employees that provide a specific service.

## Services

*   `GET /api/v1/services`: Get a list of services for the current tenant.
*   `GET /api/v1/services/{id}`: Get a service by ID.
*   `GET /api/v1/services/by-category/{categoryId}`: Get services within a specific category.
*   `GET /api/v1/services/categories`: Get a list of service categories.
*   `GET /api/v1/services/categories/list`: Get a list of service categories.
*   `GET /api/v1/services/categories/{id}`: Get a service category by ID.

## Clients

*   `GET /api/v1/clients`: Get a list of clients for the current tenant.
*   `GET /api/v1/clients/{id}`: Get a client by ID.
*   `GET /api/v1/clients/phone/{phone}`: Get a client by phone number.
*   `GET /api/v1/clients/search`: Search for clients.

## Booking

*   `POST /api/v1/booking/appointments`: Create a new appointment.
*   `GET /api/v1/booking/appointments/client/{clientId}`: Get appointments for a specific client.
*   `GET /api/v1/booking/appointments/employee/{employeeId}`: Get appointments for a specific employee.
*   `PUT /api/v1/booking/appointments/{id}/cancel`: Cancel an appointment.
*   `PUT /api/v1/booking/appointments/{id}/confirm`: Confirm an appointment.
*   `GET /api/v1/booking/slots`: Get available booking slots.

## Payments

*   `POST /api/v1/payments`: Create a new payment.
*   `GET /api/v1/payments/{id}`: Get a payment by ID.
*   `GET /api/v1/payments/appointment/{appointmentId}`: Get payments for a specific appointment.
*   `GET /api/v1/payments/client/{clientId}`: Get payments for a specific client.
*   `GET /api/v1/payments/tenant/{tenantId}`: Get payments for a specific tenant.
*   `PUT /api/v1/payments/{id}/mark-paid`: Mark a payment as paid.
*   `POST /api/v1/payments/{id}/refund`: Refund a payment.
*   `POST /api/v1/payments/webhooks/stripe`: Stripe webhook endpoint.
*   `POST /api/v1/payments/webhooks/yukassa`: Yookassa webhook endpoint.
*   `GET /api/v1/payments/settings/{tenantId}`: Get payment settings for a tenant.
*   `PUT /api/v1/payments/settings/{tenantId}`: Update payment settings for a tenant.
*   `GET /api/v1/payments/statistics/{tenantId}`: Get payment statistics for a tenant.
'''
