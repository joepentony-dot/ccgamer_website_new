#!/usr/bin/env python3
from pathlib import Path

path = Path("supabase/functions/send-new-game-notification/index.ts")
source = path.read_text(encoding="utf-8")

replacements = [
    (
        'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";\n',
        'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";\n'
        'import {\n'
        '  brandedFrom,\n'
        '  buildBrandedEmailHtml,\n'
        '  buildBrandedPlainText,\n'
        '} from "./email-template.ts";\n',
    ),
    (
        '  const emailFrom = text(Deno.env.get("EMAIL_FROM"));\n',
        '  const emailFrom = brandedFrom(Deno.env.get("EMAIL_FROM"));\n',
    ),
    (
        '''      const html = buildEmailHtml({
        title,
        contentType,
        category,
        contentUrl,
        thumbnail,
        preferencesUrl,
        unsubscribeUrl,
        isTest: testEmail,
      });
      const plainText = buildPlainText(title, label, contentUrl, preferencesUrl);
''',
        '''      const brandedArgs = {
        title,
        contentType,
        category,
        mode,
        contentUrl,
        thumbnail,
        preferencesUrl,
        unsubscribeUrl,
        siteOrigin,
        recipientEmail: recipient.email,
        subject,
        isTest: testEmail,
      };
      const html = buildBrandedEmailHtml(brandedArgs);
      const plainText = buildBrandedPlainText(brandedArgs);
''',
    ),
]

for old, new in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one exact match, found {count}: {old[:90]!r}")
    source = source.replace(old, new, 1)

path.write_text(source, encoding="utf-8")
print("Applied Phase 20C branded email integration.")
