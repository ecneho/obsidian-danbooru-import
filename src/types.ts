export interface PostResponse {
	id: number;
	file_url: string;
	tag_string_character: string;
	tag_string_copyright: string;
	tag_string_artist: string;
	tag_string_general: string;
	rating: Rating;
	file_ext: ImageExtension;
}

export type Rating = "g" | "s" | "q" | "e";

export const RatingDict: Record<Rating, string> = {
	g: "General",
	s: "Sensitive",
	q: "Questionable",
	e: "Explicit",
}

export const IMAGE_EXTENSIONS = ["png", "jpg"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export interface AttributeEntry {
	key: string;
	value: string;
}
