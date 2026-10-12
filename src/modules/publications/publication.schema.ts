import { z } from "zod";
import { hexColor, requiredText, tagList, text, urlOrPath } from "@/lib/schema";

export const createPublicationSchema = z.object({
  title: requiredText(300),
  date: requiredText(50),
  publisher: requiredText(50),
  publisherFull: text(200),
  accent: hexColor,
  image: urlOrPath,
  description: requiredText(5000),
  tags: tagList,
  paperUrl: urlOrPath,
});
