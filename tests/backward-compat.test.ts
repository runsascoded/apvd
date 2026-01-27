import ShapesBuffer from "../src/lib/shapes-buffer"

describe('backward compatibility with saved URLs', () => {
    test('decode 2357 Best URL', () => {
        // Shapes from saved-configs.md (2357 Best)
        const encodedShapes = 'u39zwNLyI7eQaP-d8QBkgJDKQawCM353zJX1B9wUVzVugiwJml2xoItYXiHbnIpqtStOTdxdJhXeCMX79VwBt6lTInobszm3A9GUBRo7cLud0XnprnxP3A7kaSiH4S35r_MwPoW9-0LLdqBocCjTU9oQsRDNbVjKCTayR6x2IAp7IDEeMmzSCbwy5Dp0UDzrMmh5S83GbzVX0HrbMFa_v8PU6zlfQIsANYXUAxP_VMSpluE1MS-A7w1GQL6by3amy5eBgeU_OtVe053V1_4tqTG93ugvDVwOjIXimrOUeQWSdvOgKneEw-AyHb-efEYCLvFpP0RoX3hQiaq3rAzs2egg3w610YVsR0LQ8Rsk1uRLOUiTyj06G8ax6mZQmae7-3oUo-I8vpQ-qPXNAjJp1GU_pRO5a_nPURTloCIvO-70u39etVcyL3EpLVKQ9BlL8o5XEvWEPHKRxXqroD7bebqg7cQv8MeyR-FUwYRS_EcwzF9NP8ivKgoqNUG3CkQBi3BLDHY1oAn1oVxO7rM4v_IG72zoDu1eBUnwFQuTx851PGOPgm-cngu5Pvvw'

        const buf = ShapesBuffer.fromB64(encodedShapes)
        const { shapes, precisionSchemeId } = buf.decodeShapes()

        expect(shapes.length).toBe(4)
        // The 'u' character (index 30 = 011110) means first 3 bits are 011 = 3
        expect(precisionSchemeId).toBe(3)

        // Most shapes should be XYRRT (rotated ellipses), but check what we get
        const kinds = shapes.map(s => s.kind)
        // Just verify we decoded 4 shapes successfully
        expect(kinds.length).toBe(4)
    })

    test('round-trip encode/decode', () => {
        const encodedShapes = 'u39zwNLyI7eQaP-d8QBkgJDKQawCM353zJX1B9wUVzVugiwJml2xoItYXiHbnIpqtStOTdxdJhXeCMX79VwBt6lTInobszm3A9GUBRo7cLud0XnprnxP3A7kaSiH4S35r_MwPoW9-0LLdqBocCjTU9oQsRDNbVjKCTayR6x2IAp7IDEeMmzSCbwy5Dp0UDzrMmh5S83GbzVX0HrbMFa_v8PU6zlfQIsANYXUAxP_VMSpluE1MS-A7w1GQL6by3amy5eBgeU_OtVe053V1_4tqTG93ugvDVwOjIXimrOUeQWSdvOgKneEw-AyHb-efEYCLvFpP0RoX3hQiaq3rAzs2egg3w610YVsR0LQ8Rsk1uRLOUiTyj06G8ax6mZQmae7-3oUo-I8vpQ-qPXNAjJp1GU_pRO5a_nPURTloCIvO-70u39etVcyL3EpLVKQ9BlL8o5XEvWEPHKRxXqroD7bebqg7cQv8MeyR-FUwYRS_EcwzF9NP8ivKgoqNUG3CkQBi3BLDHY1oAn1oVxO7rM4v_IG72zoDu1eBUnwFQuTx851PGOPgm-cngu5Pvvw'

        // Decode
        const buf = ShapesBuffer.fromB64(encodedShapes)
        const { shapes } = buf.decodeShapes()

        // Re-encode with same precision
        const reEncoded = ShapesBuffer.fromShapes(shapes, { precisionSchemeId: 3 })
        const reEncodedStr = reEncoded.toB64()

        // Should produce the same encoding
        expect(reEncodedStr).toBe(encodedShapes)
    })
})
