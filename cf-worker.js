const CF_API = "https://api.cloudflare.com/client/v4";

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return new Response("POST required", {
        status: 405,
        headers: corsHeaders,
      });
    }
    try {
      const { apiToken, zoneId, domain, canisterId, isApexDomain, subdomain } =
        await request.json();
      const baseDomain = subdomain
        ? domain.replace(`${subdomain}.`, "")
        : domain;
      const domainName = isApexDomain ? domain : `${subdomain}.${baseDomain}`;
      const acmeName = isApexDomain
        ? `_acme-challenge.${domain}`
        : `_acme-challenge.${subdomain}.${baseDomain}`;
      const canisterName = isApexDomain
        ? `_canister-id.${domain}`
        : `_canister-id.${subdomain}.${baseDomain}`;

      const results = [];
      results.push(
        await upsertRecord(
          apiToken,
          zoneId,
          { type: "CNAME", name: domainName, content: "icp1.io" },
          "CNAME Domain mapping"
        )
      );
      results.push(
        await upsertRecord(
          apiToken,
          zoneId,
          {
            type: "CNAME",
            name: acmeName,
            content: `_acme-challenge.${domain}.icp2.io`,
          },
          "CNAME ACME challenge"
        )
      );
      // TXT record: delete all existing, then create new (IC requires exactly one)
      results.push(
        await replaceAllRecords(
          apiToken,
          zoneId,
          { type: "TXT", name: canisterName, content: `"${canisterId}"` },
          "TXT Canister ID"
        )
      );

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

async function upsertRecord(apiToken, zoneId, params, label) {
  try {
    const existing = await listRecords(
      apiToken,
      zoneId,
      params.name,
      params.type
    );
    if (existing.length > 0) {
      await updateRecord(apiToken, zoneId, existing[0].id, params);
      return {
        record: label,
        success: true,
        message: "Updated",
        action: "updated",
      };
    } else {
      await createRecord(apiToken, zoneId, params);
      return {
        record: label,
        success: true,
        message: "Created",
        action: "created",
      };
    }
  } catch (error) {
    return {
      record: label,
      success: false,
      message: error.message,
      action: "error",
    };
  }
}

// Delete all existing records, then create new one (for TXT records that must be unique)
async function replaceAllRecords(apiToken, zoneId, params, label) {
  try {
    const existing = await listRecords(
      apiToken,
      zoneId,
      params.name,
      params.type
    );

    // Delete all existing records
    for (const record of existing) {
      await deleteRecord(apiToken, zoneId, record.id);
    }

    // Create new record
    await createRecord(apiToken, zoneId, params);

    const action = existing.length > 0 ? "updated" : "created";
    const message =
      existing.length > 1
        ? `Replaced ${existing.length} records`
        : existing.length === 1
        ? "Updated"
        : "Created";

    return { record: label, success: true, message, action };
  } catch (error) {
    return {
      record: label,
      success: false,
      message: error.message,
      action: "error",
    };
  }
}

async function listRecords(apiToken, zoneId, name, type) {
  const params = new URLSearchParams({ name, type });
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records?${params}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!data.success)
    throw new Error(data.errors[0]?.message || "Failed to list records");
  return data.result;
}

async function createRecord(apiToken, zoneId, params) {
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: params.type,
      name: params.name,
      content: params.content,
      ttl: 1,
      proxied: false,
    }),
  });
  const data = await res.json();
  if (!data.success)
    throw new Error(data.errors[0]?.message || "Failed to create record");
  return data.result;
}

async function updateRecord(apiToken, zoneId, recordId, params) {
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: params.type,
      name: params.name,
      content: params.content,
      ttl: 1,
      proxied: false,
    }),
  });
  const data = await res.json();
  if (!data.success)
    throw new Error(data.errors[0]?.message || "Failed to update record");
  return data.result;
}

async function deleteRecord(apiToken, zoneId, recordId) {
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!data.success)
    throw new Error(data.errors[0]?.message || "Failed to delete record");
  return data.result;
}
