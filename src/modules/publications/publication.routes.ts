import { createCrudRouter } from "@/lib/crud";
import { PublicationModel } from "@/modules/publications/publication.model";
import { createPublicationSchema } from "@/modules/publications/publication.schema";

export const publicationsRouter = createCrudRouter({
  name: "Publication",
  model: PublicationModel,
  createSchema: createPublicationSchema,
  fileFields: ["image"],
});
