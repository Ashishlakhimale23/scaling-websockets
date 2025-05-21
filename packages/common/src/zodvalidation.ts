import z from "zod"
interface Userdata {
    username : string,
    email : string,
    password : string
}
const userSchema = z.object({
    username: z.string(),
    email: z.string().email(),
    password: z.string()
        .min(6, { message: "Password should be at least 6 characters" })
        .regex(/(?=.*[a-zA-Z])/, { message: "Password should contain at least one letter" })
        .regex(/(?=.*[!@#$%^&*(),.?":{}|<>])/, { message: "Password should contain at least one special character" })
        .regex(/(?=.*\d)/, { message: "Password should contain at least one number" })
});
export function ZodValidation(data : Userdata): { result: boolean; errormessage: string } {
    const validation = userSchema.safeParse(data);
    console.log(validation)
    
    if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message || "Validation failed";
        return { result: false, errormessage: errorMessage };
    }
    
    return { result: true, errormessage: "success" };
};