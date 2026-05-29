const BASE_URL = "https://api.abacatepay.com/v1";

type Customer = {
  name?: string;
  cellphone?: string;
  email: string;
  taxId?: string;
};

type CreatePixQrCodeParams = {
  amount: number; // cents
  description?: string;
  expiresIn?: number; // seconds
  customer?: Customer;
};

type PixQrCodeResponse = {
  data: {
    id: string;
    brCode: string;
    brCodeBase64: string;
    amount: number;
    status: string;
    expiresAt: string;
    createdAt: string;
  };
  error: string | null;
};

type PixStatus = "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";

type PixStatusResponse = {
  data: { status: PixStatus; expiresAt: string };
  error: string | null;
};

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>
): Promise<T> {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error("ABACATEPAY_API_KEY not configured");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AbacatePay error ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

export function createPixQrCode(params: CreatePixQrCodeParams) {
  return request<PixQrCodeResponse>("/pixQrCode/create", "POST", {
    amount: params.amount,
    ...(params.description ? { description: params.description } : {}),
    ...(params.expiresIn ? { expiresIn: params.expiresIn } : {}),
    ...(params.customer ? { customer: params.customer } : {}),
  });
}

export function checkPixStatus(pixId: string) {
  return request<PixStatusResponse>(`/pixQrCode/check?id=${pixId}`);
}
